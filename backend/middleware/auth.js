import internalAuth from '../internal/auth.js';
import error from '../lib/error.js';

/**
 * Authentication middleware
 */
export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new error.AuthError('No token provided');
        }

        const token = authHeader.substring(7);
        const user = await internalAuth.verifyToken(token);

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        res.status(err.statusCode || 401).json({
            error: {
                code: err.statusCode || 401,
                message: err.message || 'Unauthorized',
            },
        });
    }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: 401,
                    message: 'Unauthorized',
                },
            });
        }

        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some((role) => userRoles.includes(role));

        if (!hasRole && !userRoles.includes('admin')) {
            return res.status(403).json({
                error: {
                    code: 403,
                    message: 'Forbidden',
                },
            });
        }

        next();
    };
}

export default {
    authenticate,
    authorize,
};
