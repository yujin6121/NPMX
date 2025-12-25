import fs from 'fs';
import { getDbPath } from './db.js';
import { global as logger } from './logger.js';

export function checkDb() {
    const dbPath = getDbPath();
    logger.info(`Checking database at: ${dbPath}`);

    try {
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            logger.info(`Database exists. Size: ${stats.size} bytes, Created: ${stats.birthtime}, Modified: ${stats.mtime}`);
        } else {
            logger.warn('Database file does not exist. It will be created by Knex.');
        }
    } catch (err) {
        logger.error(`Failed to check database: ${err.message}`);
    }
}
