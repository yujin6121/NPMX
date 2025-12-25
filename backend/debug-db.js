import knex from './db.js';

async function debugDb() {
    try {
        console.log('--- Database Debug Info ---');
        
        // Check users
        const users = await knex('user').select('id', 'email', 'name', 'totp_enabled', 'is_deleted');
        console.log('Users:', users);

        // Check proxy hosts
        const hosts = await knex('proxy_host').select('id', 'domain_names', 'forward_host');
        console.log('Proxy Hosts:', hosts);

        // Check migrations
        try {
            const migrations = await knex('knex_migrations').select('*');
            console.log('Migrations:', migrations.map(m => m.name));
        } catch (e) {
            console.log('Migrations table not found or empty');
        }

        console.log('---------------------------');
    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await knex.destroy();
    }
}

debugDb();
