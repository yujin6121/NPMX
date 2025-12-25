import express from 'express';
import geoip from 'geoip-lite';
import ProxyHost from '../models/proxy_host.js';
import ActivityLog from '../models/activity_log.js';
import Setting from '../models/setting.js';
import { global as logger } from '../logger.js';

const router = express.Router();

const REGEX_AI = "(gptbot|claudebot|bytespider|perplexity|seekrbot|anthropic-ai|duckassist|chatgpt)";
const REGEX_GOOGLE = "(googlebot)";
const REGEX_SEARCH = "(bingbot|yandex|naver|daum|baidu|duckduckgo|yahoo! slurp)";
const REGEX_SOCIAL = "(facebookexternalhit|facebot|twitterbot|discordbot|slackbot|telegrambot)";
const REGEX_SCRAPER = "(mj12bot|ahrefsbot|semrush|dotbot|screaming frog|megaindex|censys|nessus|nikto|acunetix|python-requests|curl|wget|libwww-perl)";

// Internal GeoIP check used by Nginx auth_request
router.get('/check', async (req, res) => {
    try {
        const remote = req.ip || req.socket?.remoteAddress || '';
        const isLocal = remote.includes('127.0.0.1') || remote.includes('::1') || remote.startsWith('10.') || remote.startsWith('192.168.') || remote.startsWith('172.16.') || remote.startsWith('172.17.') || remote.startsWith('172.18.') || remote.startsWith('172.19.') || remote.startsWith('172.20.') || remote.startsWith('172.21.') || remote.startsWith('172.22.') || remote.startsWith('172.23.') || remote.startsWith('172.24.') || remote.startsWith('172.25.') || remote.startsWith('172.26.') || remote.startsWith('172.27.') || remote.startsWith('172.28.') || remote.startsWith('172.29.') || remote.startsWith('172.30.') || remote.startsWith('172.31.') || remote.startsWith('fd') || remote.startsWith('fc');
        if (!isLocal) {
            return res.status(403).json({ error: 'GeoIP check is internal only' });
        }

        const hostId = parseInt(req.query.id, 10);
        if (!hostId) {
            return res.status(400).json({ error: 'Missing host id' });
        }

        const proxyHost = await ProxyHost.query()
            .where('is_deleted', 0)
            .andWhere('id', hostId)
            .first();

        if (!proxyHost) {
            return res.status(404).json({ error: 'Proxy host not found' });
        }

        const clientIp = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
        const geo = clientIp ? geoip.lookup(clientIp) : null;
        const country = (geo && geo.country) ? geo.country.toUpperCase() : 'UNKNOWN';

        const meta = proxyHost.meta || {};
        const allowList = Array.isArray(meta.geoip_allow_countries) ? meta.geoip_allow_countries.map(c => c.toUpperCase()) : [];
        const denyList = Array.isArray(meta.geoip_deny_countries) ? meta.geoip_deny_countries.map(c => c.toUpperCase()) : [];

        const recordBlock = async (action, reason) => {
            // Record to activity log so owners can see blocked attempts in the UI
            const ownerId = proxyHost.owner_user_id;
            if (!ownerId) return; // no owner → skip to avoid orphaned rows
            try {
                await ActivityLog.query().insert({
                    user_id: ownerId,
                    action: action,
                    details: JSON.stringify({
                        host_id: hostId,
                        domains: proxyHost.domain_names || [],
                        country,
                        reason,
                        ip: clientIp,
                    }),
                    ip: clientIp,
                    user_agent: req.headers['user-agent'] || null,
                });
            } catch (e) {
                logger.warn('Failed to record block activity', e);
            }
        };

        // Bot Check
        if (meta.bot_block_enabled) {
            const userAgent = req.headers['user-agent'] || '';
            const setting = await Setting.query().where('name', 'security-center').first();
            const botRules = (setting && setting.meta && setting.meta.botRules) ? setting.meta.botRules : {
                block_ai_bots: true,
                block_google_bot: false,
                block_other_search_bots: false,
                block_social_bots: false,
                block_scrapers: true
            };

            let botAction = null;
            if (botRules.block_ai_bots && new RegExp(REGEX_AI, 'i').test(userAgent)) botAction = 'bot_block_ai';
            else if (botRules.block_google_bot && new RegExp(REGEX_GOOGLE, 'i').test(userAgent)) botAction = 'bot_block_google';
            else if (botRules.block_other_search_bots && new RegExp(REGEX_SEARCH, 'i').test(userAgent)) botAction = 'bot_block_search';
            else if (botRules.block_social_bots && new RegExp(REGEX_SOCIAL, 'i').test(userAgent)) botAction = 'bot_block_social';
            else if (botRules.block_scrapers && new RegExp(REGEX_SCRAPER, 'i').test(userAgent)) botAction = 'bot_block_scraper';

            if (botAction) {
                logger.info(`[Bot] Blocked ${botAction} host ${hostId} ip ${clientIp}`);
                await recordBlock(botAction, 'bot_detected');
                return res.status(403).json({ error: 'Bot blocked', type: botAction });
            }
        }

        // Allow list takes precedence
        if (allowList.length > 0 && !allowList.includes(country)) {
            logger.info(`[GeoIP] Deny (not in allow list) host ${hostId} ip ${clientIp} country ${country}`);
            await recordBlock('geoip_block', 'not_in_allow_list');
            return res.status(403).json({ error: 'Country not allowed', country });
        }

        if (denyList.includes(country)) {
            logger.info(`[GeoIP] Deny (in deny list) host ${hostId} ip ${clientIp} country ${country}`);
            await recordBlock('geoip_block', 'in_deny_list');
            return res.status(403).json({ error: 'Country denied', country });
        }

        return res.json({ ok: true, country });
    } catch (error) {
        logger.error('GeoIP check failed', error);
        return res.status(500).json({ error: 'GeoIP check failed' });
    }
});

export default router;
