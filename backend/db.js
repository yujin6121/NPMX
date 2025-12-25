import Knex from 'knex';
import { Model } from 'objection';
import { db as logger } from './logger.js';

const dbPath = process.env.DB_PATH || '/data/database.sqlite';

logger.info(`Database path: ${dbPath}`);

function createKnex() {
    return Knex({
        client: 'better-sqlite3',
        connection: {
            filename: dbPath,
        },
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn, cb) => {
                conn.pragma('journal_mode = WAL');
                conn.pragma('synchronous = NORMAL');
                conn.pragma('foreign_keys = ON');
                cb();
            },
        },
    });
}

let knex = createKnex();

// Give the Knex instance to Objection
Model.knex(knex);

export function getDbPath() {
    return dbPath;
}

export function getKnex() {
    return knex;
}

export async function resetKnex() {
    if (knex) {
        await knex.destroy();
    }
    knex = createKnex();
    Model.knex(knex);
    return knex;
}

export default knex;
