import knex from './db.js';
import { db as logger } from './logger.js';

export async function migrateUp() {
    logger.info('Running database migrations...');
    try {
        await knex.migrate.latest();
        logger.success('Database migrations completed');
    } catch (err) {
        logger.error('Migration failed:', err);
        throw err;
    }
}

export async function migrateDown() {
    logger.info('Rolling back database migrations...');
    try {
        await knex.migrate.rollback();
        logger.success('Database rollback completed');
    } catch (err) {
        logger.error('Rollback failed:', err);
        throw err;
    }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateUp()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
