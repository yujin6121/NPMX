/**
 * Initial database schema
 */
export async function up(knex) {
    // Users table
    await knex.schema.createTable('user', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.string('name', 255).notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('password', 255).notNullable();
        table.string('avatar', 255).notNullable().defaultTo('');
        table.json('roles').notNullable().defaultTo('[]');
        table.integer('is_disabled').notNullable().defaultTo(0);
        table.index(['is_deleted', 'email']);
    });

    // Auth tokens table
    await knex.schema.createTable('auth', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('user_id').unsigned().notNullable();
        table.string('token', 255).notNullable().unique();
        table.timestamp('expires_on').notNullable();
        table.foreign('user_id').references('user.id').onDelete('CASCADE');
        table.index(['is_deleted', 'token']);
    });

    // Certificates table
    await knex.schema.createTable('certificate', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('owner_user_id').unsigned().notNullable();
        table.string('provider', 50).notNullable();
        table.string('nice_name', 255).notNullable();
        table.json('domain_names').notNullable();
        table.timestamp('expires_on').notNullable();
        table.json('meta').notNullable().defaultTo('{}');
        table.foreign('owner_user_id').references('user.id').onDelete('CASCADE');
        table.index(['is_deleted', 'provider']);
    });

    // Proxy hosts table
    await knex.schema.createTable('proxy_host', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('owner_user_id').unsigned().notNullable();
        table.json('domain_names').notNullable();
        table.string('forward_scheme', 10).notNullable().defaultTo('http');
        table.string('forward_host', 255).notNullable();
        table.integer('forward_port').notNullable();
        table.integer('certificate_id').unsigned().defaultTo(0);
        table.integer('ssl_forced').notNullable().defaultTo(0);
        table.integer('hsts_enabled').notNullable().defaultTo(0);
        table.integer('hsts_subdomains').notNullable().defaultTo(0);
        table.integer('http2_support').notNullable().defaultTo(1);
        table.integer('http3_support').notNullable().defaultTo(1);
        table.integer('block_exploits').notNullable().defaultTo(1);
        table.integer('caching_enabled').notNullable().defaultTo(0);
        table.integer('allow_websocket_upgrade').notNullable().defaultTo(0);
        table.text('access_list').notNullable().defaultTo('');
        table.text('advanced_config').notNullable().defaultTo('');
        table.integer('enabled').notNullable().defaultTo(1);
        table.json('meta').notNullable().defaultTo('{}');
        table.foreign('owner_user_id').references('user.id').onDelete('CASCADE');
        table.foreign('certificate_id').references('certificate.id').onDelete('SET NULL');
        table.index(['is_deleted', 'enabled']);
    });

    // Redirection hosts table
    await knex.schema.createTable('redirection_host', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('owner_user_id').unsigned().notNullable();
        table.json('domain_names').notNullable();
        table.string('forward_scheme', 10).notNullable().defaultTo('$scheme');
        table.string('forward_domain_name', 255).notNullable();
        table.integer('preserve_path').notNullable().defaultTo(1);
        table.integer('certificate_id').unsigned().defaultTo(0);
        table.integer('ssl_forced').notNullable().defaultTo(0);
        table.integer('hsts_enabled').notNullable().defaultTo(0);
        table.integer('hsts_subdomains').notNullable().defaultTo(0);
        table.integer('http2_support').notNullable().defaultTo(1);
        table.integer('http3_support').notNullable().defaultTo(1);
        table.integer('block_exploits').notNullable().defaultTo(1);
        table.text('advanced_config').notNullable().defaultTo('');
        table.integer('enabled').notNullable().defaultTo(1);
        table.json('meta').notNullable().defaultTo('{}');
        table.foreign('owner_user_id').references('user.id').onDelete('CASCADE');
        table.foreign('certificate_id').references('certificate.id').onDelete('SET NULL');
        table.index(['is_deleted', 'enabled']);
    });

    // Dead hosts table (404 pages)
    await knex.schema.createTable('dead_host', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('owner_user_id').unsigned().notNullable();
        table.json('domain_names').notNullable();
        table.integer('certificate_id').unsigned().defaultTo(0);
        table.text('advanced_config').notNullable().defaultTo('');
        table.integer('enabled').notNullable().defaultTo(1);
        table.json('meta').notNullable().defaultTo('{}');
        table.foreign('owner_user_id').references('user.id').onDelete('CASCADE');
        table.foreign('certificate_id').references('certificate.id').onDelete('SET NULL');
        table.index(['is_deleted', 'enabled']);
    });

    // Audit log table
    await knex.schema.createTable('audit_log', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('user_id').unsigned().notNullable();
        table.string('action', 50).notNullable();
        table.string('object_type', 50).notNullable();
        table.integer('object_id').unsigned().notNullable();
        table.json('meta').notNullable().defaultTo('{}');
        table.foreign('user_id').references('user.id').onDelete('CASCADE');
        table.index(['is_deleted', 'user_id', 'created_on']);
    });

    // Settings table
    await knex.schema.createTable('setting', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.string('name', 255).notNullable().unique();
        table.text('description').notNullable().defaultTo('');
        table.text('value').notNullable();
        table.json('meta').notNullable().defaultTo('{}');
        table.index(['is_deleted', 'name']);
    });
}

export async function down(knex) {
    await knex.schema.dropTableIfExists('setting');
    await knex.schema.dropTableIfExists('audit_log');
    await knex.schema.dropTableIfExists('dead_host');
    await knex.schema.dropTableIfExists('redirection_host');
    await knex.schema.dropTableIfExists('proxy_host');
    await knex.schema.dropTableIfExists('certificate');
    await knex.schema.dropTableIfExists('auth');
    await knex.schema.dropTableIfExists('user');
}
