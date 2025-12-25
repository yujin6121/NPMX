import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import User from './models/user.js';
import Setting from './models/setting.js';
import { global as logger } from './logger.js';

const SALT_ROUNDS = 10;
const NGINX_CONFIG_DIR = process.env.NGINX_CONFIG_DIR || '/data/nginx';

/**
 * Setup initial database data
 */
export default async function setup() {
    logger.info('Running setup...');

    // Ensure default admin user exists
    const defaultEmail = process.env.DEFAULT_EMAIL || 'admin@example.com';
    const defaultPassword = process.env.DEFAULT_PASSWORD || 'changeme';

    const existingAdmin = await User.query()
        .where('is_deleted', 0)
        .andWhere('email', defaultEmail)
        .first();

    if (!existingAdmin) {
        logger.info('Creating default admin user...');

        const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

        await User.query().insert({
            name: 'Administrator',
            email: defaultEmail,
            password: hashedPassword,
            roles: JSON.stringify(['admin']),
            is_disabled: 0,
        });

        logger.success(`Default admin user created: ${defaultEmail}`);
        logger.warn(`Default password: ${defaultPassword}`);
        logger.warn('Please change the default password immediately!');
    } else {
        logger.info(`Default admin user already exists: ${defaultEmail}`);
    }

    // Create/update default settings
    const existingLeEmail = await Setting.query()
        .where('is_deleted', 0)
        .andWhere('name', 'default-letsencrypt-email')
        .first();

    if (!existingLeEmail) {
        await Setting.query().insert({
            name: 'default-letsencrypt-email',
            description: 'Default email address for Let\'s Encrypt',
            value: defaultEmail,
        });
    } else {
        await Setting.query()
            .where('id', existingLeEmail.id)
            .patch({ value: defaultEmail });
    }

    // Setup default Nginx config and self-signed certificate
    logger.info('Setting up default Nginx configuration...');
    
    const defaultConfPath = path.join(NGINX_CONFIG_DIR, 'default.conf');
    const templatePath = path.join(import.meta.dirname, 'templates', 'default.conf');
    
    if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, defaultConfPath);
        logger.success('Default Nginx configuration created');
    }

    // Generate self-signed certificate for default HTTPS server
    const certPath = path.join(NGINX_CONFIG_DIR, 'default_cert.pem');
    const keyPath = path.join(NGINX_CONFIG_DIR, 'default_cert.key');
    
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        logger.info('Generating self-signed certificate for default HTTPS server...');
        try {
            execSync(
                `openssl req -x509 -nodes -days 365 -newkey rsa:2048 ` +
                `-keyout "${keyPath}" -out "${certPath}" ` +
                `-subj "/C=KR/ST=Seoul/L=Seoul/O=Better NPM/CN=default.local"`,
                { stdio: 'pipe' }
            );
            logger.success('Self-signed certificate generated');
        } catch (err) {
            logger.error('Failed to generate self-signed certificate:', err.message);
        }
    }

    logger.success('Setup completed successfully');
}
