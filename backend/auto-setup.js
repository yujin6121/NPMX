import bcrypt from 'bcryptjs';
import knex from './db.js';
import { db as logger } from './logger.js';

const SALT_ROUNDS = 10;

/**
 * Auto setup - creates tables and default admin if needed
 */
export async function autoSetup() {
    try {
        // Check if user table exists
        const hasUserTable = await knex.schema.hasTable('user');
        
        if (!hasUserTable) {
            logger.info('Database is empty, creating tables...');
            
            // Create all tables
            await createTables();
            
            // Create default admin
            await createDefaultAdmin();
        } else {
            // Check for missing tables and create them
            await createMissingTables();
            
            // Check if admin exists
            const userCount = await knex('user').where('is_deleted', 0).count('id as count').first();
            
            if (userCount.count === 0) {
                logger.info('No users found, creating default admin...');
                await createDefaultAdmin();
            }
        }
    } catch (err) {
        logger.error('Auto setup failed:', err);
        throw err;
    }
}

async function createMissingTables() {
    // Check and create each table if missing
    const tables = [
        { name: 'proxy_host', create: async () => {
            await knex.schema.createTable('proxy_host', (table) => {
                table.increments('id').primary();
                table.text('domain_names').notNullable();
                table.string('forward_scheme').notNullable().defaultTo('http');
                table.string('forward_host').notNullable();
                table.integer('forward_port').notNullable();
                table.integer('certificate_id').notNullable().defaultTo(0);
                table.integer('ssl_forced').notNullable().defaultTo(0);
                table.integer('http3_support').notNullable().defaultTo(1);
                table.integer('block_exploits').notNullable().defaultTo(1);
                table.integer('caching_enabled').notNullable().defaultTo(0);
                table.integer('allow_websocket_upgrade').notNullable().defaultTo(0);
                table.text('custom_locations').nullable();
                table.integer('enabled').notNullable().defaultTo(1);
                table.integer('waf_enabled').notNullable().defaultTo(0);
                table.string('waf_mode').notNullable().defaultTo('DetectionOnly');
                table.integer('waf_paranoia_level').notNullable().defaultTo(1);
                table.text('geoip_allow_countries').nullable();
                table.text('geoip_deny_countries').nullable();
                table.integer('is_deleted').notNullable().defaultTo(0);
                table.timestamp('created_on').defaultTo(knex.fn.now());
                table.timestamp('modified_on').defaultTo(knex.fn.now());
            });
        }},
        { name: 'certificate', create: async () => {
            await knex.schema.createTable('certificate', (table) => {
                table.increments('id').primary();
                table.string('provider').notNullable();
                table.string('nice_name').notNullable();
                table.text('domain_names').notNullable();
                table.text('meta').nullable();
                table.integer('is_deleted').notNullable().defaultTo(0);
                table.timestamp('created_on').defaultTo(knex.fn.now());
                table.timestamp('modified_on').defaultTo(knex.fn.now());
                table.timestamp('expires_on').nullable();
            });
        }},
        { name: 'activity_log', create: async () => {
            await knex.schema.createTable('activity_log', (table) => {
                table.increments('id').primary();
                table.integer('user_id').notNullable();
                table.string('action').notNullable();
                table.text('details').notNullable();
                table.string('ip').nullable();
                table.text('user_agent').nullable();
                table.timestamp('created_on').defaultTo(knex.fn.now());
            });
        }},
        { name: 'auth', create: async () => {
            await knex.schema.createTable('auth', (table) => {
                table.increments('id').primary();
                table.integer('user_id').notNullable();
                table.text('token').notNullable();
                table.timestamp('expires_on').notNullable();
                table.integer('is_deleted').notNullable().defaultTo(0);
                table.timestamp('created_on').defaultTo(knex.fn.now());
                table.timestamp('modified_on').defaultTo(knex.fn.now());
            });
        }},
        { name: 'setting', create: async () => {
            await knex.schema.createTable('setting', (table) => {
                table.increments('id').primary();
                table.string('name').notNullable().unique();
                table.text('value').notNullable();
                table.integer('is_deleted').notNullable().defaultTo(0);
                table.timestamp('created_on').defaultTo(knex.fn.now());
                table.timestamp('modified_on').defaultTo(knex.fn.now());
            });
        }}
    ];

    for (const { name, create } of tables) {
        const hasTable = await knex.schema.hasTable(name);
        if (!hasTable) {
            logger.info(`Creating missing table: ${name}`);
            await create();
        }
    }
}

async function createTables() {
    // User table
    await knex.schema.createTable('user', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable().unique();
        table.string('password').notNullable();
        table.text('roles').notNullable().defaultTo('[]');
        table.text('profile_image_url').nullable();
        table.integer('is_disabled').notNullable().defaultTo(0);
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.integer('totp_enabled').notNullable().defaultTo(0);
        table.text('totp_secret').nullable();
        table.timestamp('created_on').defaultTo(knex.fn.now());
        table.timestamp('modified_on').defaultTo(knex.fn.now());
    });

    // Proxy host table
    await knex.schema.createTable('proxy_host', (table) => {
        table.increments('id').primary();
        table.text('domain_names').notNullable();
        table.string('forward_scheme').notNullable().defaultTo('http');
        table.string('forward_host').notNullable();
        table.integer('forward_port').notNullable();
        table.integer('certificate_id').notNullable().defaultTo(0);
        table.integer('ssl_forced').notNullable().defaultTo(0);
        table.integer('http3_support').notNullable().defaultTo(1);
        table.integer('block_exploits').notNullable().defaultTo(1);
        table.integer('caching_enabled').notNullable().defaultTo(0);
        table.integer('allow_websocket_upgrade').notNullable().defaultTo(0);
        table.text('custom_locations').nullable();
        table.integer('enabled').notNullable().defaultTo(1);
        table.integer('waf_enabled').notNullable().defaultTo(0);
        table.string('waf_mode').notNullable().defaultTo('DetectionOnly');
        table.integer('waf_paranoia_level').notNullable().defaultTo(1);
        table.text('geoip_allow_countries').nullable();
        table.text('geoip_deny_countries').nullable();
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.timestamp('created_on').defaultTo(knex.fn.now());
        table.timestamp('modified_on').defaultTo(knex.fn.now());
    });

    // Certificate table
    await knex.schema.createTable('certificate', (table) => {
        table.increments('id').primary();
        table.string('provider').notNullable();
        table.string('nice_name').notNullable();
        table.text('domain_names').notNullable();
        table.text('meta').nullable();
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.timestamp('created_on').defaultTo(knex.fn.now());
        table.timestamp('modified_on').defaultTo(knex.fn.now());
        table.timestamp('expires_on').nullable();
    });

    // Activity log table
    await knex.schema.createTable('activity_log', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.string('action').notNullable();
        table.text('details').notNullable();
        table.string('ip').nullable();
        table.text('user_agent').nullable();
        table.timestamp('created_on').defaultTo(knex.fn.now());
    });

    // Auth table
    await knex.schema.createTable('auth', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable();
        table.text('token').notNullable();
        table.timestamp('expires_on').notNullable();
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.timestamp('created_on').defaultTo(knex.fn.now());
        table.timestamp('modified_on').defaultTo(knex.fn.now());
    });

    // Setting table
    await knex.schema.createTable('setting', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
        table.text('value').notNullable();
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.timestamp('created_on').defaultTo(knex.fn.now());
        table.timestamp('modified_on').defaultTo(knex.fn.now());
    });

    logger.success('Database tables created');
}

async function createDefaultAdmin() {
    const defaultEmail = process.env.DEFAULT_EMAIL || 'admin@example.com';
    const defaultPassword = process.env.DEFAULT_PASSWORD || 'changeme';
    
    const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    
    await knex('user').insert({
        name: 'Administrator',
        email: defaultEmail,
        password: hashedPassword,
        roles: JSON.stringify(['admin']),
        is_disabled: 0,
    });
    
    logger.success(`Default admin created: ${defaultEmail} / ${defaultPassword}`);
    logger.warn('Please change the default password immediately!');
}
