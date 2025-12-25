#!/usr/bin/env node

import app from './app.js';
import { global as logger } from './logger.js';
import { autoSetup } from './auto-setup.js';

const PORT = process.env.PORT || 3000;

async function appStart() {
    try {
        // Auto setup database and default admin
        await autoSetup();

        // Initialize Let's Encrypt renewal timer
        const internalCertificate = (await import('./internal/certificate.js')).default;
        internalCertificate.initTimer();

        // Initialize Nginx
        const internalNginx = (await import('./internal/nginx.js')).default;
        await internalNginx.sync();
        await internalNginx.reload();

        // Start the server
        const server = app.listen(PORT, async () => {
            logger.info(`Backend PID ${process.pid} listening on port ${PORT}...`);

            // Initialize WebSocket
            const { initWebSocket } = await import('./internal/websocket.js');
            initWebSocket(server);

            // Start Monitoring
            const monitor = (await import('./internal/monitor.js')).default;
            monitor.start();

            // Graceful shutdown
            process.on('SIGTERM', () => {
                logger.info(`PID ${process.pid} received SIGTERM`);
                server.close(() => {
                    logger.info('Server stopped');
                    process.exit(0);
                });
            });

            process.on('SIGINT', () => {
                logger.info(`PID ${process.pid} received SIGINT`);
                server.close(() => {
                    logger.info('Server stopped');
                    process.exit(0);
                });
            });
        });
    } catch (err) {
        logger.error(`Startup Error: ${err.message}`, err);
        setTimeout(appStart, 1000);
    }
}

try {
    appStart();
} catch (err) {
    logger.fatal(err);
    process.exit(1);
}
