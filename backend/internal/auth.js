import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import moment from 'moment';
import { authenticator } from 'otplib';
import User from '../models/user.js';
import Auth from '../models/auth.js';
import error from '../lib/error.js';
import utils from '../lib/utils.js';

const JWT_SECRET = process.env.JWT_SECRET || utils.randomString(64);
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET not set, using random secret. Tokens will be invalidated on restart!');
}

const internalAuth = {
    /**
     * Login with email and password
     */
    login: async (email, password, otp = null) => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('email', email)
            .first();

        if (!user) {
            throw new error.AuthError('Invalid email or password');
        }

        if (user.is_disabled) {
            throw new error.AuthError('Account is disabled');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new error.AuthError('Invalid email or password');
        }

        // Enforce OTP if 2FA enabled
        if (user.totp_enabled) {
            if (!user.totp_secret) {
                throw new error.AuthError('OTP configuration missing');
            }

            if (!otp) {
                throw new error.AuthError('OTP required');
            }

            const ok = authenticator.check(String(otp).replace(/\s+/g, ''), user.totp_secret);
            if (!ok) {
                throw new error.AuthError('Invalid OTP');
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: user.roles,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Store token in database
        const expiresOn = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
        await Auth.query().insert({
            user_id: user.id,
            token: token,
            expires_on: expiresOn,
        });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roles: user.roles,
            },
        };
    },

    /**
     * Get 2FA status
     */
    getTwoFactorStatus: async (userId) => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('id', userId)
            .first();

        if (!user) {
            throw new error.ItemNotFoundError(userId);
        }

        return {
            enabled: !!user.totp_enabled,
        };
    },

    /**
     * Start 2FA setup (generate & store secret, return otpauth url)
     */
    startTwoFactorSetup: async (userId, issuer = 'Better NPM') => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('id', userId)
            .first();

        if (!user) {
            throw new error.ItemNotFoundError(userId);
        }

        const secret = authenticator.generateSecret();
        await User.query()
            .where('id', userId)
            .patch({
                totp_secret: secret,
                totp_enabled: 0,
            });

        const accountName = user.email;
        const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);

        return {
            issuer,
            accountName,
            secret,
            otpauthUrl,
        };
    },

    /**
     * Confirm OTP and enable 2FA
     */
    enableTwoFactor: async (userId, otp) => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('id', userId)
            .first();

        if (!user) {
            throw new error.ItemNotFoundError(userId);
        }

        if (!user.totp_secret) {
            throw new error.ValidationError('2FA is not initialized');
        }

        if (!otp) {
            throw new error.ValidationError('OTP is required');
        }

        const ok = authenticator.check(String(otp).replace(/\s+/g, ''), user.totp_secret);
        if (!ok) {
            throw new error.AuthError('Invalid OTP');
        }

        await User.query()
            .where('id', userId)
            .patch({ totp_enabled: 1 });

        return { enabled: true };
    },

    /**
     * Verify JWT token
     */
    verifyToken: async (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Get user
            const user = await User.query()
                .where('is_deleted', 0)
                .andWhere('id', decoded.id)
                .first();

            if (!user || user.is_disabled) {
                throw new error.AuthError('User not found or disabled');
            }

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: user.roles,
            };
        } catch (err) {
            if (err instanceof error.AuthError) {
                throw err;
            }
            throw new error.AuthError('Invalid token');
        }
    },

    /**
     * Logout (invalidate token)
     */
    logout: async (token) => {
        await Auth.query()
            .where('token', token)
            .patch({ is_deleted: 1 });
    },

    /**
     * Change password
     */
    changePassword: async (userId, oldPassword, newPassword) => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('id', userId)
            .first();

        if (!user) {
            throw new error.ItemNotFoundError(userId);
        }

        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            throw new error.AuthError('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.query()
            .patchAndFetchById(userId, { password: hashedPassword });

        return true;
    },

    /**
     * Change email
     */
    changeEmail: async (userId, password, newEmail) => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('id', userId)
            .first();

        if (!user) {
            throw new error.ItemNotFoundError(userId);
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new error.AuthError('Current password is incorrect');
        }

        // Check if email already exists
        const existingUser = await User.query()
            .where('is_deleted', 0)
            .andWhere('email', newEmail)
            .andWhere('id', '!=', userId)
            .first();

        if (existingUser) {
            throw new error.ValidationError('Email already exists');
        }

        await User.query()
            .patchAndFetchById(userId, { email: newEmail });

        return true;
    },

    /**
     * Change name
     */
    changeName: async (userId, newName) => {
        const user = await User.query()
            .where('is_deleted', 0)
            .andWhere('id', userId)
            .first();

        if (!user) {
            throw new error.ItemNotFoundError(userId);
        }

        await User.query()
            .patchAndFetchById(userId, { name: newName });

        // Generate new JWT token with updated name
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: newName,
                roles: user.roles,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Store token in database
        const expiresOn = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
        await Auth.query().insert({
            user_id: user.id,
            token: token,
            expires_on: expiresOn,
        });

        return { token };
    },

    /**
     * Create new user
     */
    createUser: async (data) => {
        const existingUser = await User.query()
            .where('is_deleted', 0)
            .andWhere('email', data.email)
            .first();

        if (existingUser) {
            throw new error.ValidationError('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await User.query().insertAndFetch({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            roles: JSON.stringify(data.roles || []),
            is_disabled: 0,
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
        };
    },
};

export default internalAuth;
