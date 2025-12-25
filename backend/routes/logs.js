import express from 'express';
import fs from 'fs';
import Setting from '../models/setting.js';
import { authenticate } from '../middleware/auth.js';
import utils from '../lib/utils.js';

const router = express.Router();

const ACCESS_LOG_PATH = process.env.ACCESS_LOG_PATH || '/data/logs/proxy-access.log';
const ERROR_LOG_PATH = process.env.ERROR_LOG_PATH || '/data/logs/proxy-error.log';
const MAX_LIMIT = 2000;

const matchesPattern = (text, patterns = []) => {
    if (!text || !patterns.length) return false;
    return patterns.some((p) => {
        try {
            const regex = new RegExp(p, 'i');
            return regex.test(text);
        } catch (err) {
            return false;
        }
    });
};

async function loadFilters() {
    const defaults = { excludePatterns: [], highlightPatterns: [] };

    try {
        const setting = await Setting.query()
            .where('is_deleted', 0)
            .andWhere('name', 'log-filter-settings')
            .first();

        if (!setting) return defaults;

        const meta = setting.meta || {};
        return {
            excludePatterns: Array.isArray(meta.excludePatterns) ? meta.excludePatterns : [],
            highlightPatterns: Array.isArray(meta.highlightPatterns) ? meta.highlightPatterns : [],
        };
    } catch (err) {
        return defaults;
    }
}

async function saveFilters(meta) {
    const normalized = {
        excludePatterns: Array.isArray(meta.excludePatterns) ? meta.excludePatterns.filter(Boolean) : [],
        highlightPatterns: Array.isArray(meta.highlightPatterns) ? meta.highlightPatterns.filter(Boolean) : [],
    };

    const existing = await Setting.query()
        .where('is_deleted', 0)
        .andWhere('name', 'log-filter-settings')
        .first();

    if (!existing) {
        await Setting.query().insert({
            name: 'log-filter-settings',
            description: 'Log filtering configuration',
            value: JSON.stringify({}),
            meta: normalized,
        });
    } else {
        await Setting.query().patchAndFetchById(existing.id, {
            meta: normalized,
        });
    }

    return normalized;
}

function parseStatusFilter(raw) {
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
}

function parseLines(raw) {
    return raw.split('\n').filter(Boolean);
}

router.use(authenticate);

router.get('/settings', async (req, res, next) => {
    try {
        const filters = await loadFilters();
        res.json(filters);
    } catch (err) {
        next(err);
    }
});

router.put('/settings', async (req, res, next) => {
    try {
        const filters = await saveFilters({
            excludePatterns: req.body.excludePatterns,
            highlightPatterns: req.body.highlightPatterns,
        });
        res.json(filters);
    } catch (err) {
        next(err);
    }
});

router.get('/', async (req, res, next) => {
    const type = req.query.type === 'error' ? 'error' : 'access';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), MAX_LIMIT);
    const searchText = req.query.search ? String(req.query.search).toLowerCase() : '';
    const hostFilter = req.query.host || '';
    const ipFilter = req.query.ip || '';
    const methodFilter = req.query.method ? String(req.query.method).toUpperCase() : '';
    const blockedOnly = req.query.blocked === '1' || req.query.blocked === 'true';
    const extraExclude = req.query.exclude ? String(req.query.exclude).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const statusFilter = parseStatusFilter(req.query.status);

    try {
        const filters = await loadFilters();
        const excludePatterns = [...filters.excludePatterns, ...extraExclude];
        const sourceFile = type === 'error' ? ERROR_LOG_PATH : ACCESS_LOG_PATH;

        if (!fs.existsSync(sourceFile)) {
            return res.json({ entries: [], total: 0 });
        }

        const tailCount = Math.min(limit * 5, 5000);
        let lines = [];

        try {
            const rawTail = await utils.exec(`tail -n ${tailCount} ${sourceFile}`);
            lines = parseLines(rawTail);
        } catch (err) {
            // Fallback: read file directly if tail is unavailable
            const raw = fs.readFileSync(sourceFile, 'utf8');
            const allLines = parseLines(raw);
            lines = allLines.slice(-tailCount);
        }
        const entries = [];

        for (const line of lines) {
            if (matchesPattern(line, excludePatterns)) continue;

            if (type === 'access') {
                let obj = null;
                try {
                    obj = JSON.parse(line);
                } catch (err) {
                    obj = null;
                }

                const status = obj?.status ? parseInt(obj.status, 10) : 0;
                const candidateText = line.toLowerCase();
                const hostMatch = hostFilter ? (obj?.host || '').includes(hostFilter) : true;
                const ipMatch = ipFilter
                    ? [obj?.real_ip, obj?.client_ip, obj?.remote_addr, obj?.xff]
                        .filter(Boolean)
                        .some((v) => v.includes(ipFilter))
                    : true;
                const methodMatch = methodFilter ? obj?.method === methodFilter : true;
                const statusMatch = statusFilter.length ? statusFilter.includes(status) : true;
                const blockedMatch = blockedOnly ? status >= 400 : true;
                const searchMatch = searchText ? candidateText.includes(searchText) : true;

                if (!(hostMatch && ipMatch && methodMatch && statusMatch && blockedMatch && searchMatch)) {
                    continue;
                }

                entries.push({
                    type: 'access',
                    ...obj,
                    highlighted: matchesPattern(line, filters.highlightPatterns),
                    blocked: status >= 400,
                });
            } else {
                const candidateText = line.toLowerCase();
                const searchMatch = searchText ? candidateText.includes(searchText) : true;
                if (!searchMatch) continue;

                entries.push({
                    type: 'error',
                    raw: line,
                    timestamp: line.slice(0, 19),
                    highlighted: matchesPattern(line, filters.highlightPatterns),
                });
            }
        }

        const sliced = entries.slice(-limit);
        res.json({ entries: sliced, total: entries.length });
    } catch (err) {
        next(err);
    }
});

export default router;
