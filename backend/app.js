import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { global as logger } from './logger.js';

const app = express();

// Trust proxy
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// File upload with NO limits (unlimited upload support)
app.use(
    fileUpload({
        createParentPath: true,
        parseNested: true,
        // NO limits configuration for unlimited uploads
    })
);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import authRoutes from './routes/auth.js';
import proxyHostsRoutes from './routes/proxy-hosts.js';
import certificatesRoutes from './routes/certificates.js';
import defaultPageRoutes from './routes/default-page.js';
import portScanRoutes from './routes/port-scan.js';
import geoIpRoutes from './routes/geoip.js';
import backupRoutes from './routes/backup.js';
import systemRoutes from './routes/system.js';
import activityRoutes from './routes/activity.js';
import logRoutes from './routes/logs.js';
import securityRoutes from './routes/security.js';

app.use('/api/auth', authRoutes);
app.use('/api/proxy-hosts', proxyHostsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/default-page', defaultPageRoutes);
app.use('/api/port-scan', portScanRoutes);
app.use('/api/geoip', geoIpRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/security', securityRoutes);


// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            code: 404,
            message: 'Not Found',
        },
    });
});

// Error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(`Error ${statusCode}: ${message}`, err);

    res.status(statusCode).json({
        error: {
            code: statusCode,
            message: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
});

export default app;
