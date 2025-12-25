import express from 'express';
import fs from 'fs/promises';
import path from 'path';

import { authenticate } from '../middleware/auth.js';
import { getDbPath, getKnex, resetKnex } from '../db.js';

const router = express.Router();

router.use(authenticate);

let restoreInProgress = false;

function timestampForFilename(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
        `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
}

async function safeUnlink(filePath) {
    try {
        await fs.unlink(filePath);
    } catch (e) {
        if (e && e.code !== 'ENOENT') throw e;
    }
}

function isSQLiteHeader(buffer) {
    if (!buffer || buffer.length < 16) return false;
    return buffer.subarray(0, 16).toString('utf8') === 'SQLite format 3\u0000';
}

/**
 * GET /api/backup/download
 * Download a SQLite backup file.
 */
router.get('/download', async (req, res, next) => {
    try {
        const dbPath = getDbPath();

        // Try to checkpoint WAL so the main file is up-to-date.
        try {
            const knex = getKnex();
            await knex.raw('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch {
            // Ignore checkpoint errors and still attempt download.
        }

        await fs.access(dbPath);

        const filename = `better-npm-backup-${timestampForFilename()}.sqlite`;
        res.download(dbPath, filename);
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return res.status(404).json({
                error: {
                    code: 404,
                    message: 'Database file not found',
                },
            });
        }
        next(err);
    }
});

/**
 * POST /api/backup/restore
 * Restore SQLite database from an uploaded backup file.
 * Expects multipart/form-data with field name: backup
 */
router.post('/restore', async (req, res, next) => {
    if (restoreInProgress) {
        return res.status(409).json({
            error: {
                code: 409,
                message: 'Restore already in progress',
            },
        });
    }

    restoreInProgress = true;

    try {
        const file = req.files?.backup;

        if (!file) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Missing backup file (field name: backup)',
                },
            });
        }

        const fileBuffer = file.data;
        if (!isSQLiteHeader(fileBuffer)) {
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Invalid backup file (not a SQLite database)',
                },
            });
        }

        const dbPath = getDbPath();
        const dir = path.dirname(dbPath);
        await fs.mkdir(dir, { recursive: true });

        // Close DB connection before touching files.
        try {
            await getKnex().destroy();
        } catch {
            // ignore
        }

        const stamp = timestampForFilename();
        const bakPath = `${dbPath}.bak-${stamp}`;
        const tmpPath = `${dbPath}.upload-${stamp}`;

        // Write upload to temp file first.
        await fs.writeFile(tmpPath, fileBuffer);

        // Remove WAL/SHM for a clean swap.
        await safeUnlink(`${dbPath}-wal`);
        await safeUnlink(`${dbPath}-shm`);

        // Backup current DB if it exists.
        try {
            await fs.rename(dbPath, bakPath);
        } catch (e) {
            if (e && e.code !== 'ENOENT') throw e;
        }

        // Move new DB into place.
        await fs.rename(tmpPath, dbPath);

        // Ensure no leftover WAL/SHM.
        await safeUnlink(`${dbPath}-wal`);
        await safeUnlink(`${dbPath}-shm`);

        // Re-initialize knex/objection binding.
        await resetKnex();

        res.json({ ok: true });
    } catch (err) {
        next(err);
    } finally {
        restoreInProgress = false;
    }
});

export default router;
