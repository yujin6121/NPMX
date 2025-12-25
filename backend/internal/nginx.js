import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
import { nginx as logger } from '../logger.js';
import utils from '../lib/utils.js';

const NGINX_CONFIG_DIR = process.env.NGINX_CONFIG_DIR || '/data/nginx';
const NGINX_PROXY_HOST_DIR = `${NGINX_CONFIG_DIR}/proxy_host`;
const NGINX_TEMP_DIR = `${NGINX_CONFIG_DIR}/temp`;
const LOG_DIR = process.env.NGINX_LOG_DIR || '/data/logs';
const TEMPLATE_DIR = path.join(import.meta.dirname, '../templates');

// Ensure directories exist
[NGINX_CONFIG_DIR, NGINX_PROXY_HOST_DIR, NGINX_TEMP_DIR, LOG_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Initialize LiquidJS
const liquid = new Liquid({
    root: TEMPLATE_DIR,
    extname: '.conf',
});

const internalNginx = {
    /**
     * Generate Nginx configuration for a proxy host
     */
    generateProxyHostConfig: async (proxyHost) => {
        logger.info(`Generating config for proxy host #${proxyHost.id}`);

        const domainNames = Array.isArray(proxyHost.domain_names)
            ? proxyHost.domain_names
            : JSON.parse(proxyHost.domain_names || '[]');

        const template = await liquid.renderFile('proxy_host', {
            id: proxyHost.id,
            enabled: proxyHost.enabled,
            domain_names: domainNames,
            forward_scheme: proxyHost.forward_scheme,
            forward_host: proxyHost.forward_host,
            forward_port: proxyHost.forward_port,
            certificate_id: proxyHost.certificate_id || 0,
            certificate: proxyHost.certificate || null,
            ssl_forced: proxyHost.ssl_forced,
            hsts_enabled: proxyHost.hsts_enabled,
            hsts_subdomains: proxyHost.hsts_subdomains,
            http2_support: proxyHost.http2_support,
            http3_support: proxyHost.http3_support,
            block_exploits: proxyHost.block_exploits,
            allow_websocket_upgrade: proxyHost.allow_websocket_upgrade,
            advanced_config: proxyHost.advanced_config || '',
            geoip_allow_countries: (proxyHost.meta && Array.isArray(proxyHost.meta.geoip_allow_countries)) ? proxyHost.meta.geoip_allow_countries : [],
            geoip_deny_countries: (proxyHost.meta && Array.isArray(proxyHost.meta.geoip_deny_countries)) ? proxyHost.meta.geoip_deny_countries : [],
            brotli_enabled: !!(proxyHost.meta?.brotli_enabled),
            security_headers_enabled: !!(proxyHost.meta?.security_headers_enabled),
            waf_enabled: !!(proxyHost.meta?.waf_enabled),
            waf_mode: proxyHost.meta?.waf_mode || 'DetectionOnly',
            waf_paranoia_level: proxyHost.meta?.waf_paranoia_level || 1,
            bot_block_enabled: proxyHost.meta?.bot_block_enabled ? 1 : 0,
            bot_challenge_enabled: proxyHost.meta?.bot_challenge_enabled ? 1 : 0,
        });

        const configPath = path.join(NGINX_PROXY_HOST_DIR, `${proxyHost.id}.conf`);
        fs.writeFileSync(configPath, template);

        logger.success(`Config generated: ${configPath}`);
        return configPath;
    },

    /**
     * Delete Nginx configuration for a proxy host
     */
    deleteProxyHostConfig: async (proxyHostId) => {
        const configPath = path.join(NGINX_PROXY_HOST_DIR, `${proxyHostId}.conf`);
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
            logger.info(`Deleted config: ${configPath}`);
        }
    },

    /**
     * Generate Let's Encrypt request configuration
     */
    generateLetsEncryptRequestConfig: async (certificate) => {
        logger.info(`Generating Let's Encrypt request config for cert #${certificate.id}`);

        const domainNames = Array.isArray(certificate.domain_names)
            ? certificate.domain_names
            : JSON.parse(certificate.domain_names || '[]');

        const template = await liquid.renderFile('letsencrypt_request', {
            id: certificate.id,
            domain_names: domainNames,
        });

        const configPath = path.join(NGINX_TEMP_DIR, `letsencrypt-${certificate.id}.conf`);
        fs.writeFileSync(configPath, template);

        logger.success(`LE request config generated: ${configPath}`);
        return configPath;
    },

    /**
     * Delete Let's Encrypt request configuration
     */
    deleteLetsEncryptRequestConfig: async (certificate) => {
        const configPath = path.join(NGINX_TEMP_DIR, `letsencrypt-${certificate.id}.conf`);
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
            logger.info(`Deleted LE request config: ${configPath}`);
        }
    },

    /**
     * Test Nginx configuration
     */
    test: async () => {
        logger.info('Testing Nginx configuration...');
        try {
            const result = await utils.exec('nginx -t');
            logger.success('Nginx configuration test passed');
            return result;
        } catch (err) {
            logger.error('Nginx configuration test failed:', err.message);
            throw err;
        }
    },

    /**
     * Generate default page configuration
     */
    generateDefaultPageConfig: async (portType, config) => {
        logger.info(`Generating default page config for ${portType}`);

        let locationBlock = '';

        if (config.action_type === 'html') {
            // Escape single quotes in HTML for shell safety
            const escapedHtml = config.html_content.replace(/'/g, "'\\''");
            locationBlock = `
        location / {
            return 200 '${escapedHtml}';
            add_header Content-Type text/html;
        }`;
        } else if (config.action_type === 'redirect') {
            locationBlock = `
        location / {
            return 301 ${config.redirect_url};
        }`;
        } else if (config.action_type === 'not_found') {
            locationBlock = `
        location / {
            return 404;
        }`;
        }

        const serverBlock = portType === 'http'
            ? `
    # Default server for 80 (HTTP)
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
${locationBlock}
    }`
            : `
    # Default server for 443 (HTTPS)
    server {
        listen 443 ssl default_server;
        listen [::]:443 ssl default_server;
        listen 443 quic reuseport default_server;
        listen [::]:443 quic reuseport default_server;
        server_name _;
        ssl_certificate /data/nginx/default_cert.pem;
        ssl_certificate_key /data/nginx/default_cert.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
${locationBlock}
    }`;

        const configPath = path.join(NGINX_CONFIG_DIR, `default_${portType}.conf`);
        fs.writeFileSync(configPath, serverBlock);
        logger.success(`Default page config generated: ${configPath}`);
        return configPath;
    },

    /**
     * Setup default Nginx configuration
     */
    setupDefault: async () => {
        logger.info('Setting up default Nginx configuration...');
        try {
            const defaultConfPath = path.join(NGINX_CONFIG_DIR, 'default.conf');
            const templatePath = path.join(TEMPLATE_DIR, 'default.conf');
            
            if (fs.existsSync(templatePath) && !fs.existsSync(defaultConfPath)) {
                fs.copyFileSync(templatePath, defaultConfPath);
                logger.success('Default Nginx configuration created');
            }

            // Setup HTML directory and copy default HTML files
            const htmlDir = path.join(NGINX_CONFIG_DIR, '../html');
            if (!fs.existsSync(htmlDir)) {
                fs.mkdirSync(htmlDir, { recursive: true });
                logger.info('Created HTML directory');
            }

            // Copy default HTML files
            const htmlFiles = ['default-http.html', 'default-https.html'];
            for (const htmlFile of htmlFiles) {
                const srcPath = path.join(TEMPLATE_DIR, htmlFile);
                const destPath = path.join(htmlDir, htmlFile);
                if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                    logger.info(`Copied ${htmlFile} to ${destPath}`);
                } else if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, destPath);
                    logger.info(`Updated ${htmlFile}`);
                }
            }

            // Generate self-signed certificate for default HTTPS server
            const certPath = path.join(NGINX_CONFIG_DIR, 'default_cert.pem');
            const keyPath = path.join(NGINX_CONFIG_DIR, 'default_cert.key');
            
            if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
                logger.info('Generating self-signed certificate for default HTTPS server...');
                try {
                    await utils.exec(
                        `openssl req -x509 -nodes -days 365 -newkey rsa:2048 ` +
                        `-keyout "${keyPath}" -out "${certPath}" ` +
                        `-subj "/C=KR/ST=Seoul/L=Seoul/O=Better NPM/CN=default.local"`
                    );
                    logger.success('Self-signed certificate generated');
                } catch (err) {
                    logger.error('Failed to generate self-signed certificate:', err.message);
                }
            }
        } catch (err) {
            logger.error('Failed to setup default configuration:', err);
        }
    },

    /**
     * Sync Nginx configuration
     * Regenerates all config files for enabled proxy hosts
     */
    sync: async () => {
        logger.info('Syncing Nginx configuration...');
        try {
            // Setup default configuration first
            await internalNginx.setupDefault();

            const ProxyHost = (await import('../models/proxy_host.js')).default;

            const hosts = await ProxyHost.query()
                .where('is_deleted', 0)
                .withGraphFetched('[certificate, custom_locations]');

            for (const host of hosts) {
                await internalNginx.generateProxyHostConfig(host);
            }

            logger.success(`Synced ${hosts.length} proxy hosts`);
        } catch (err) {
            logger.error('Failed to sync Nginx configuration:', err);
        }
    },

    /**
     * Reload Nginx
     */
    reload: async () => {
        logger.info('Reloading Nginx...');
        try {
            // Test first
            await internalNginx.test();

            // Then reload
            const result = await utils.exec('nginx -s reload');
            logger.success('Nginx reloaded successfully');
            return result;
        } catch (err) {
            logger.error('Nginx reload failed:', err.message);
            throw err;
        }
    },
};

export default internalNginx;
