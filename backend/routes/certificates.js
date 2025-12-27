import express from 'express';
import Certificate from '../models/certificate.js';
import User from '../models/user.js';
import ProxyHost from '../models/proxy_host.js';
import { authenticate } from '../middleware/auth.js';
import internalCertificate from '../internal/certificate.js';
import internalNginx from '../internal/nginx.js';
import utils from '../lib/utils.js';
import error from '../lib/error.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/certificates
 * Get all certificates
 */
router.get('/', async (req, res, next) => {
    try {
        const certificates = await Certificate.query()
            .where('is_deleted', 0)
            .withGraphFetched('[owner, proxy_hosts]')
            .orderBy('created_on', 'desc');

        res.json(utils.omitRows(['owner.password', 'meta.dns_provider_credentials'])(certificates));
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/certificates/:id
 * Get a single certificate
 */
router.get('/:id', async (req, res, next) => {
    try {
        const certificate = await Certificate.query()
            .where('is_deleted', 0)
            .andWhere('id', req.params.id)
            .withGraphFetched('[owner, proxy_hosts]')
            .first();

        if (!certificate) {
            return res.status(404).json({
                error: {
                    code: 404,
                    message: 'Certificate not found',
                },
            });
        }

        res.json(utils.omitRow(['owner.password', 'meta.dns_provider_credentials'])(certificate));
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/certificates
 * Request a new Let's Encrypt certificate
 */
router.post('/', async (req, res, next) => {
    try {
        console.log('[DEBUG] POST /certificates - Request body:', JSON.stringify(req.body, null, 2));
        
        const { domain_names, email } = req.body;

        if (!domain_names || !Array.isArray(domain_names) || domain_names.length === 0) {
            console.error('[ERROR] Domain names validation failed:', domain_names);
            return res.status(400).json({
                error: {
                    code: 400,
                    message: 'Domain names are required and must be an array',
                },
            });
        }

        // Use user's email if not provided
        let certEmail = email;
        if (!certEmail) {
            const user = await User.query().where('id', req.user.id).first();
            certEmail = user.email;
        }

        // Create certificate record
        const certificate = await Certificate.query().insertAndFetch({
            owner_user_id: req.user.id,
            provider: 'letsencrypt',
            nice_name: domain_names.join(', '),
            domain_names: JSON.stringify(domain_names),
            expires_on: new Date(), // Will be updated after certificate is obtained
            meta: JSON.stringify({}),
        });

        try {
            // Find any proxy hosts using these domains and disable them temporarily
            const affectedHosts = await ProxyHost.query()
                .where('is_deleted', 0)
                .andWhere('enabled', 1)
                .whereRaw(`json_extract(domain_names, '$') LIKE '%${domain_names[0]}%'`);

            // Disable affected hosts
            for (const host of affectedHosts) {
                await ProxyHost.query().patchAndFetchById(host.id, { enabled: 0 });
                await internalNginx.deleteProxyHostConfig(host.id);
            }

            // Generate Let's Encrypt request config
            await internalNginx.generateLetsEncryptRequestConfig(certificate);
            await internalNginx.reload();

            // Request certificate
            await internalCertificate.requestCertificate(certificate, certEmail);

            // Remove LE request config
            await internalNginx.deleteLetsEncryptRequestConfig(certificate);

            // Re-enable affected hosts
            for (const host of affectedHosts) {
                await ProxyHost.query().patchAndFetchById(host.id, { enabled: 1 });
                const updatedHost = await ProxyHost.query()
                    .where('id', host.id)
                    .withGraphFetched('certificate')
                    .first();
                await internalNginx.generateProxyHostConfig(updatedHost);
            }

            await internalNginx.reload();

            // Get updated certificate
            const updatedCert = await Certificate.query()
                .where('id', certificate.id)
                .first();

            res.status(201).json(updatedCert);
        } catch (err) {
            console.error('[ERROR] Certificate request failed:', err.message, err.stack);
            // Cleanup temp config
            try {
                await internalNginx.deleteLetsEncryptRequestConfig(certificate);
            } catch {}

            // Re-enable affected hosts if they were disabled
            try {
                const affectedHosts = await ProxyHost.query()
                    .where('is_deleted', 0)
                    .andWhere('enabled', 0)
                    .whereRaw(`json_extract(domain_names, '$') LIKE '%${domain_names[0]}%'`);

                for (const host of affectedHosts) {
                    await ProxyHost.query().patchAndFetchById(host.id, { enabled: 1 });
                    const updatedHost = await ProxyHost.query()
                        .where('id', host.id)
                        .withGraphFetched('certificate')
                        .first();
                    await internalNginx.generateProxyHostConfig(updatedHost);
                }

                if (affectedHosts.length) {
                    await internalNginx.reload();
                }
            } catch {}

            // Delete certificate on failure
            await Certificate.query().deleteById(certificate.id);
            throw err;
        }
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/certificates/:id
 * Delete a certificate
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const certificate = await Certificate.query()
            .where('is_deleted', 0)
            .andWhere('id', req.params.id)
            .first();

        if (!certificate) {
            return res.status(404).json({
                error: {
                    code: 404,
                    message: 'Certificate not found',
                },
            });
        }

        // Check if certificate is in use
        const proxyHosts = await ProxyHost.query()
            .where('is_deleted', 0)
            .andWhere('certificate_id', req.params.id);

        if (proxyHosts.length > 0) {
            // Detach certificate from hosts
            for (const host of proxyHosts) {
                await ProxyHost.query().patchAndFetchById(host.id, {
                    certificate_id: null,
                    ssl_forced: 0
                });

                const updatedHost = await ProxyHost.query()
                    .where('id', host.id)
                    .withGraphFetched('certificate')
                    .first();

                await internalNginx.generateProxyHostConfig(updatedHost);
            }
            
            await internalNginx.reload();
        }

        // Revoke Let's Encrypt certificate
        if (certificate.provider === 'letsencrypt') {
            try {
                await internalCertificate.revokeCertificate(certificate);
            } catch (err) {
                // Log but don't fail
                console.error('Failed to revoke certificate:', err);
            }
        }

        // Soft delete
        await Certificate.query()
            .patchAndFetchById(req.params.id, { is_deleted: 1 });

        res.json({ message: 'Certificate deleted successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;
