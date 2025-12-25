import express from 'express';
import DefaultPage from '../models/default_page.js';

const router = express.Router();

/**
 * GET /api/default-page/:portType
 * Get default page configuration for HTTP or HTTPS
 */
router.get('/:portType', async (req, res, next) => {
    try {
        const { portType } = req.params;

        if (!['http', 'https'].includes(portType)) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Invalid port type. Must be "http" or "https"',
                },
            });
        }

        const config = await DefaultPage.query()
            .where('port_type', portType)
            .where('is_deleted', 0)
            .first();

        res.json(config || { port_type: portType, action_type: 'html' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/default-page/:portType
 * Create or update default page configuration
 */
router.post('/:portType', async (req, res, next) => {
    try {
        const { portType } = req.params;
        const { action_type, html_content, redirect_url } = req.body;

        if (!['http', 'https'].includes(portType)) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Invalid port type. Must be "http" or "https"',
                },
            });
        }

        if (!['html', 'redirect', 'not_found'].includes(action_type)) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Invalid action type. Must be "html", "redirect", or "not_found"',
                },
            });
        }

        // Validate required fields based on action type
        if (action_type === 'html' && !html_content) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'HTML content is required when action type is "html"',
                },
            });
        }

        if (action_type === 'redirect' && !redirect_url) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Redirect URL is required when action type is "redirect"',
                },
            });
        }

        // Check if config exists
        let config = await DefaultPage.query()
            .where('port_type', portType)
            .where('is_deleted', 0)
            .first();

        if (config) {
            // Update existing config
            await config.$query().patch({
                action_type,
                html_content,
                redirect_url,
            });
        } else {
            // Create new config
            config = await DefaultPage.query().insert({
                port_type: portType,
                action_type,
                html_content,
                redirect_url,
            });
        }

        res.json(config);
    } catch (err) {
        next(err);
    }
});

export default router;
