import express from 'express';
import internalAuth from '../internal/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, otp } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Email and password are required',
                },
            });
        }

        try {
            const result = await internalAuth.login(email, password, otp);
            req.user = result.user;
            const { record } = await import('../internal/activity.js');
            await record(req, 'login', { user_id: result.user.id, email });
            res.json(result);
        } catch (err) {
            // Provide machine-readable flags for frontend
            if (err?.name === 'AuthError' && err?.message === 'OTP required') {
                return res.status(401).json({
                    error: {
                        code: 401,
                        message: 'OTP required',
                        otp_required: true,
                    },
                });
            }
            if (err?.name === 'AuthError' && err?.message === 'Invalid OTP') {
                return res.status(401).json({
                    error: {
                        code: 401,
                        message: 'Invalid OTP',
                        otp_invalid: true,
                    },
                });
            }
            // Login failures are expected, don't log as errors
            if (err?.name === 'AuthError') {
                return res.status(401).json({
                    error: {
                        code: 401,
                        message: err.message || 'Authentication failed',
                    },
                });
            }
            throw err;
        }
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/auth/me
 * Get current user info from token
 */
router.get('/me', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: { code: 401, message: 'Unauthorized' },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);
        res.json({ user });
    } catch (err) {
        return res.status(401).json({
            error: { code: 401, message: 'Invalid token' },
        });
    }
});

/**
 * GET /api/auth/2fa/status
 */
router.get('/2fa/status', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: { code: 401, message: 'Unauthorized' },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);
        // Populate req.user so activity recorder can read it
        req.user = user;
        const status = await internalAuth.getTwoFactorStatus(user.id);
        res.json(status);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/2fa/setup
 * Generates secret and returns otpauth URL
 */
router.post('/2fa/setup', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: { code: 401, message: 'Unauthorized' },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);
        req.user = user;
        const result = await internalAuth.startTwoFactorSetup(user.id);
        const { record } = await import('../internal/activity.js');
        await record(req, 'otp_setup_start', { user_id: user.id });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/2fa/enable
 * Verify OTP and enable 2FA
 */
router.post('/2fa/enable', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: { code: 401, message: 'Unauthorized' },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);
        req.user = user;
        const { otp } = req.body;
        const result = await internalAuth.enableTwoFactor(user.id, otp);
        const { record } = await import('../internal/activity.js');
        await record(req, 'otp_enabled', { user_id: user.id });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/logout
 * Logout (invalidate token)
 */
router.post('/logout', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            await internalAuth.logout(token);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    code: 401,
                    message: 'Unauthorized',
                },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Old password and new password are required',
                },
            });
        }

        await internalAuth.changePassword(user.id, oldPassword, newPassword);
        // Record activity
        const { record } = await import('../internal/activity.js');
        await record(req, 'change_password', { user_id: user.id });
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/change-email
 * Change email
 */
router.post('/change-email', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    code: 401,
                    message: 'Unauthorized',
                },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);
        req.user = user;

        const { password, newEmail } = req.body;

        if (!password || !newEmail) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Password and new email are required',
                },
            });
        }

        await internalAuth.changeEmail(user.id, password, newEmail);
        const { record } = await import('../internal/activity.js');
        await record(req, 'change_email', { user_id: user.id, new_email: newEmail });
        res.json({ message: 'Email changed successfully' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/change-name
 * Change name
 */
router.post('/change-name', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    code: 401,
                    message: 'Unauthorized',
                },
            });
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);
        req.user = user;

        const { newName } = req.body;

        if (!newName) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'New name is required',
                },
            });
        }

        const result = await internalAuth.changeName(user.id, newName);
        const { record } = await import('../internal/activity.js');
        await record(req, 'change_name', { user_id: user.id, new_name: newName });
        res.json({
            message: 'Name changed successfully',
            token: result.token
        });
    } catch (err) {
        next(err);
    }
});

export default router;
