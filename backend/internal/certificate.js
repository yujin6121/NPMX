import fs from 'fs';
import path from 'path';
import moment from 'moment';
import Certificate from '../models/certificate.js';
import { ssl as logger } from '../logger.js';
import utils from '../lib/utils.js';
import error from '../lib/error.js';
import internalNginx from './nginx.js';

const LETSENCRYPT_DIR = process.env.LETSENCRYPT_DIR || '/data/letsencrypt';
const LETSENCRYPT_LIVE_DIR = `${LETSENCRYPT_DIR}/live`;
const ACME_CHALLENGE_DIR = '/tmp/acme-challenge';
const CERTBOT_COMMAND = 'certbot';

// Ensure directories exist
[LETSENCRYPT_DIR, LETSENCRYPT_LIVE_DIR, ACME_CHALLENGE_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const internalCertificate = {
    intervalTimeout: 1000 * 60 * 60, // 1 hour
    interval: null,
    intervalProcessing: false,
    renewBeforeExpirationBy: [30, 'days'], // Renew 30 days before expiration

    /**
     * Initialize the renewal timer
     */
    initTimer: () => {
        logger.info("Let's Encrypt Renewal Timer initialized");
        internalCertificate.interval = setInterval(
            internalCertificate.processExpiringCertificates,
            internalCertificate.intervalTimeout
        );
        // Run immediately on startup
        internalCertificate.processExpiringCertificates();
    },

    /**
     * Process expiring certificates
     */
    processExpiringCertificates: async () => {
        if (internalCertificate.intervalProcessing) {
            return;
        }

        internalCertificate.intervalProcessing = true;
        logger.info(
            `Checking for SSL certificates expiring within ${internalCertificate.renewBeforeExpirationBy[0]} ${internalCertificate.renewBeforeExpirationBy[1]}...`
        );

        try {
            const expirationThreshold = moment()
                .add(
                    internalCertificate.renewBeforeExpirationBy[0],
                    internalCertificate.renewBeforeExpirationBy[1]
                )
                .format('YYYY-MM-DD HH:mm:ss');

            const certificates = await Certificate.query()
                .where('is_deleted', 0)
                .andWhere('provider', 'letsencrypt')
                .andWhere('expires_on', '<', expirationThreshold);

            if (!certificates || certificates.length === 0) {
                logger.info('No certificates need renewal');
                internalCertificate.intervalProcessing = false;
                return;
            }

            logger.info(`Found ${certificates.length} certificate(s) to renew`);

            // Renew certificates sequentially
            for (const certificate of certificates) {
                try {
                    await internalCertificate.renewCertificate(certificate);
                } catch (err) {
                    logger.error(`Failed to renew certificate #${certificate.id}:`, err.message);
                }
            }

            logger.success('Certificate renewal process completed');
        } catch (err) {
            logger.error('Certificate renewal process failed:', err);
        } finally {
            internalCertificate.intervalProcessing = false;
        }
    },

    /**
     * Request a new Let's Encrypt certificate
     */
    requestCertificate: async (certificate, email) => {
        // Normalize domain_names (may be stored as JSON string in SQLite)
        const domainNames = Array.isArray(certificate.domain_names)
            ? certificate.domain_names
            : JSON.parse(certificate.domain_names || '[]');

        logger.info(
            `Requesting Let's Encrypt certificate for: ${domainNames.join(', ')}`
        );

        const certName = `npm-${certificate.id}`;
        const webroot = ACME_CHALLENGE_DIR;

        // Best-effort cleanup of stale certbot locks to avoid "Another instance is running"
        const lockFiles = [
            path.join('/tmp/letsencrypt-work', '.certbot.lock'),
            path.join(LETSENCRYPT_DIR, '.certbot.lock'),
        ];
        lockFiles.forEach((lockPath) => {
            try {
                if (fs.existsSync(lockPath)) {
                    fs.unlinkSync(lockPath);
                    logger.warn(`Removed stale certbot lock: ${lockPath}`);
                }
            } catch (e) {
                logger.warn(`Could not remove certbot lock ${lockPath}: ${e.message}`);
            }
        });

        const args = [
            'certonly',
            '--webroot',
            '--webroot-path',
            webroot,
            '--cert-name',
            certName,
            '--agree-tos',
            '--non-interactive',
            '--email',
            email,
            '--config-dir',
            LETSENCRYPT_DIR,
            '--work-dir',
            '/tmp/letsencrypt-work',
            '--logs-dir',
            '/data/logs/letsencrypt',
        ];

        // Add domains
        domainNames.forEach((domain) => {
            args.push('-d', domain);
        });

        // Use staging server if in development
        if (process.env.LETSENCRYPT_STAGING === 'true') {
            args.push('--staging');
            logger.warn('Using Let\'s Encrypt STAGING server');
        }

        try {
            const result = await utils.exec(`${CERTBOT_COMMAND} ${args.join(' ')}`);
            logger.success(`Certificate obtained successfully for ${certName}`);

            // Get certificate info
            const certInfo = await internalCertificate.getCertificateInfo(certificate.id);

            // Update certificate expiration date
            await Certificate.query()
                .patchAndFetchById(certificate.id, {
                    expires_on: moment(certInfo.notAfter).format('YYYY-MM-DD HH:mm:ss'),
                });

            return result;
        } catch (err) {
            logger.error('Certificate request failed:', err.message);
            throw new error.ValidationError(`Failed to obtain certificate: ${err.message}`);
        }
    },

    /**
     * Renew an existing certificate
     */
    renewCertificate: async (certificate) => {
        logger.info(`Renewing certificate #${certificate.id}`);

        const certName = `npm-${certificate.id}`;

        try {
            const result = await utils.exec(
                `${CERTBOT_COMMAND} renew --cert-name ${certName} --config-dir ${LETSENCRYPT_DIR}`
            );

            logger.success(`Certificate #${certificate.id} renewed successfully`);

            // Update expiration date
            const certInfo = await internalCertificate.getCertificateInfo(certificate.id);
            await Certificate.query()
                .patchAndFetchById(certificate.id, {
                    expires_on: moment(certInfo.notAfter).format('YYYY-MM-DD HH:mm:ss'),
                });

            // Reload Nginx to use new certificate
            await internalNginx.reload();

            return result;
        } catch (err) {
            logger.error(`Certificate renewal failed for #${certificate.id}:`, err.message);
            throw err;
        }
    },

    /**
     * Revoke a certificate
     */
    revokeCertificate: async (certificate) => {
        logger.info(`Revoking certificate #${certificate.id}`);

        const certName = `npm-${certificate.id}`;
        const certPath = path.join(LETSENCRYPT_LIVE_DIR, certName, 'fullchain.pem');

        if (!fs.existsSync(certPath)) {
            logger.warn(`Certificate file not found: ${certPath}`);
            return;
        }

        try {
            await utils.exec(
                `${CERTBOT_COMMAND} revoke --cert-path ${certPath} --config-dir ${LETSENCRYPT_DIR} --non-interactive`
            );
            logger.success(`Certificate #${certificate.id} revoked successfully`);
        } catch (err) {
            logger.error(`Certificate revocation failed:`, err.message);
            // Don't throw, just log the error
        }
    },

    /**
     * Get certificate information from disk
     */
    getCertificateInfo: async (certificateId) => {
        const certPath = path.join(LETSENCRYPT_LIVE_DIR, `npm-${certificateId}`, 'fullchain.pem');

        if (!fs.existsSync(certPath)) {
            throw new error.ItemNotFoundError(`Certificate file not found: ${certPath}`);
        }

        try {
            const result = await utils.exec(`openssl x509 -in ${certPath} -noout -dates`);
            const lines = result.split('\n');

            const info = {};
            lines.forEach((line) => {
                if (line.startsWith('notBefore=')) {
                    info.notBefore = moment(line.replace('notBefore=', ''), 'MMM DD HH:mm:ss YYYY z').toDate();
                } else if (line.startsWith('notAfter=')) {
                    info.notAfter = moment(line.replace('notAfter=', ''), 'MMM DD HH:mm:ss YYYY z').toDate();
                }
            });

            return info;
        } catch (err) {
            throw new error.ValidationError(`Failed to read certificate info: ${err.message}`);
        }
    },

    /**
     * Get the live certificate directory path
     */
    getLiveCertPath: (certificateId) => {
        return path.join(LETSENCRYPT_LIVE_DIR, `npm-${certificateId}`);
    },
};

export default internalCertificate;
