import express from 'express';
import ProxyHost from '../models/proxy_host.js';
import Certificate from '../models/certificate.js';
import { authenticate } from '../middleware/auth.js';
import internalNginx from '../internal/nginx.js';
import utils from '../lib/utils.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/proxy-hosts
 * Get all proxy hosts
 */
router.get('/', async (req, res, next) => {
    try {
        const proxyHosts = await ProxyHost.query()
            .where('is_deleted', 0)
            .withGraphFetched('[certificate, owner]')
            .orderBy('created_on', 'desc');

        res.json(utils.omitRows(['owner.password'])(proxyHosts));
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/proxy-hosts/:id
 * Get a single proxy host
 */
router.get('/:id', async (req, res, next) => {
    try {
        const proxyHost = await ProxyHost.query()
            .where('is_deleted', 0)
            .andWhere('id', req.params.id)
            .withGraphFetched('[certificate, owner]')
            .first();

        if (!proxyHost) {
            return res.status(404).json({
                error: {
                    code: 404,
                    message: 'Proxy host not found',
                },
            });
        }

        res.json(utils.omitRow(['owner.password'])(proxyHost));
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/proxy-hosts
 * Create a new proxy host
 */
router.post('/', async (req, res, next) => {
    try {
        // Debug: Log incoming request body
        console.log('[DEBUG] POST /proxy-hosts - Request body:', JSON.stringify(req.body, null, 2));

        const allowCountries = Array.isArray(req.body.geoip_allow_countries)
            ? req.body.geoip_allow_countries.map((c) => c.toUpperCase()).filter(Boolean)
            : [];
        const denyCountries = Array.isArray(req.body.geoip_deny_countries)
            ? req.body.geoip_deny_countries.map((c) => c.toUpperCase()).filter(Boolean)
            : [];

        const data = {
            owner_user_id: req.user.id,
            domain_names: req.body.domain_names || [],
            forward_scheme: req.body.forward_scheme || 'http',
            forward_host: req.body.forward_host,
            forward_port: req.body.forward_port,
            certificate_id: req.body.certificate_id || null,
            ssl_forced: !!req.body.ssl_forced,
            hsts_enabled: !!req.body.hsts_enabled,
            hsts_subdomains: !!req.body.hsts_subdomains,
            http2_support: req.body.http2_support !== undefined ? !!req.body.http2_support : true,
            http3_support: req.body.http3_support !== undefined ? !!req.body.http3_support : true,
            block_exploits: req.body.block_exploits !== undefined ? !!req.body.block_exploits : true,
            caching_enabled: !!req.body.caching_enabled,
            allow_websocket_upgrade: !!req.body.allow_websocket_upgrade,
            advanced_config: req.body.advanced_config || '',
            enabled: req.body.enabled !== undefined ? !!req.body.enabled : true,
            meta: {
                ...(req.body.meta || {}),
                geoip_allow_countries: allowCountries,
                geoip_deny_countries: denyCountries,
                brotli_enabled: !!req.body.brotli_enabled,
                security_headers_enabled: !!req.body.security_headers_enabled,
                waf_enabled: !!req.body.waf_enabled,
                waf_mode: req.body.waf_mode || 'DetectionOnly',
                waf_paranoia_level: req.body.waf_paranoia_level !== undefined ? Number(req.body.waf_paranoia_level) : 1,
                bot_block_enabled: req.body.bot_block_enabled ? 1 : 0,
                bot_challenge_enabled: req.body.bot_challenge_enabled ? 1 : 0,
            },
        };

        const proxyHost = await ProxyHost.query().insertAndFetch(data);
        const { record } = await import('../internal/activity.js');
        await record(req, 'add_proxy_host', { id: proxyHost.id, domain_names: proxyHost.domain_names });

        // Get certificate if needed
        if (proxyHost.certificate_id > 0) {
            proxyHost.certificate = await Certificate.query()
                .where('id', proxyHost.certificate_id)
                .first();
        }

        // Generate Nginx config
        await internalNginx.generateProxyHostConfig(proxyHost);
        await internalNginx.reload();

        res.status(201).json(proxyHost);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /api/proxy-hosts/:id
 * Update a proxy host
 */
router.put('/:id', async (req, res, next) => {
    try {
        const proxyHost = await ProxyHost.query()
            .where('is_deleted', 0)
            .andWhere('id', req.params.id)
            .first();

        if (!proxyHost) {
            return res.status(404).json({
                error: {
                    code: 404,
                    message: 'Proxy host not found',
                },
            });
        }

        const allowCountries = Array.isArray(req.body.geoip_allow_countries)
            ? req.body.geoip_allow_countries.map((c) => c.toUpperCase()).filter(Boolean)
            : (Array.isArray(proxyHost.meta?.geoip_allow_countries) ? proxyHost.meta.geoip_allow_countries : []);
        const denyCountries = Array.isArray(req.body.geoip_deny_countries)
            ? req.body.geoip_deny_countries.map((c) => c.toUpperCase()).filter(Boolean)
            : (Array.isArray(proxyHost.meta?.geoip_deny_countries) ? proxyHost.meta.geoip_deny_countries : []);

        const data = {
            domain_names: req.body.domain_names || proxyHost.domain_names,
            forward_scheme: req.body.forward_scheme || proxyHost.forward_scheme,
            forward_host: req.body.forward_host || proxyHost.forward_host,
            forward_port: req.body.forward_port || proxyHost.forward_port,
            certificate_id: req.body.certificate_id !== undefined ? req.body.certificate_id : proxyHost.certificate_id,
            ssl_forced: req.body.ssl_forced !== undefined ? req.body.ssl_forced : proxyHost.ssl_forced,
            hsts_enabled: req.body.hsts_enabled !== undefined ? req.body.hsts_enabled : proxyHost.hsts_enabled,
            hsts_subdomains: req.body.hsts_subdomains !== undefined ? req.body.hsts_subdomains : proxyHost.hsts_subdomains,
            http2_support: req.body.http2_support !== undefined ? req.body.http2_support : proxyHost.http2_support,
            http3_support: req.body.http3_support !== undefined ? req.body.http3_support : proxyHost.http3_support,
            block_exploits: req.body.block_exploits !== undefined ? req.body.block_exploits : proxyHost.block_exploits,
            allow_websocket_upgrade: req.body.allow_websocket_upgrade !== undefined ? req.body.allow_websocket_upgrade : proxyHost.allow_websocket_upgrade,
            advanced_config: req.body.advanced_config !== undefined ? req.body.advanced_config : proxyHost.advanced_config,
            enabled: req.body.enabled !== undefined ? req.body.enabled : proxyHost.enabled,
            meta: {
                ...(proxyHost.meta || {}),
                ...(req.body.meta || {}),
                geoip_allow_countries: allowCountries,
                geoip_deny_countries: denyCountries,
                brotli_enabled: req.body.brotli_enabled !== undefined ? !!req.body.brotli_enabled : !!(proxyHost.meta?.brotli_enabled),
                security_headers_enabled: req.body.security_headers_enabled !== undefined ? !!req.body.security_headers_enabled : !!(proxyHost.meta?.security_headers_enabled),
                waf_enabled: req.body.waf_enabled !== undefined ? !!req.body.waf_enabled : !!(proxyHost.meta?.waf_enabled),
                waf_mode: req.body.waf_mode !== undefined ? req.body.waf_mode : (proxyHost.meta?.waf_mode || 'DetectionOnly'),
                waf_paranoia_level: req.body.waf_paranoia_level !== undefined ? Number(req.body.waf_paranoia_level) : (proxyHost.meta?.waf_paranoia_level || 1),
                bot_block_enabled: req.body.bot_block_enabled !== undefined ? (req.body.bot_block_enabled ? 1 : 0) : (proxyHost.meta?.bot_block_enabled ? 1 : 0),
                bot_challenge_enabled: req.body.bot_challenge_enabled !== undefined ? (req.body.bot_challenge_enabled ? 1 : 0) : (proxyHost.meta?.bot_challenge_enabled ? 1 : 0),
            },
        };

        const updated = await ProxyHost.query().patchAndFetchById(req.params.id, data);
        const { record } = await import('../internal/activity.js');
        await record(req, 'update_proxy_host', { id: updated.id, domain_names: updated.domain_names });

        // Get certificate if needed
        if (updated.certificate_id > 0) {
            updated.certificate = await Certificate.query()
                .where('id', updated.certificate_id)
                .first();
        }

        // Regenerate Nginx config
        await internalNginx.generateProxyHostConfig(updated);
        await internalNginx.reload();

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/proxy-hosts/:id
 * Delete a proxy host
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const proxyHost = await ProxyHost.query()
            .where('is_deleted', 0)
            .andWhere('id', req.params.id)
            .first();

        if (!proxyHost) {
            return res.status(404).json({
                error: {
                    code: 404,
                    message: 'Proxy host not found',
                },
            });
        }

        // Soft delete
        await ProxyHost.query()
            .patchAndFetchById(req.params.id, { is_deleted: 1 });

        // Delete Nginx config
        await internalNginx.deleteProxyHostConfig(req.params.id);
        await internalNginx.reload();

        const { record } = await import('../internal/activity.js');
        await record(req, 'delete_proxy_host', { id: req.params.id });
        res.json({ message: 'Proxy host deleted successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;
