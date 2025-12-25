const dbPath = process.env.DB_PATH || '/data/database.sqlite';

export default {
    client: 'better-sqlite3',
    connection: {
        filename: dbPath,
    },
    useNullAsDefault: true,
    migrations: {
        directory: './migrations',
        tableName: 'knex_migrations',
    },
};
