import tcpping from 'tcp-ping';
import { Tail } from 'tail';
import { global as logger } from '../logger.js';
import ProxyHost from '../models/proxy_host.js';
import { broadcast } from './websocket.js';
import Setting from '../models/setting.js';
import fs from 'fs';

const ACCESS_LOG_PATH = process.env.ACCESS_LOG_PATH || '/data/logs/proxy-access.log';
const ERROR_LOG_PATH = process.env.ERROR_LOG_PATH || '/data/logs/proxy-error.log';

let pingInterval;
let accessTail;
let errorTail;

const PING_INTERVAL_MS = 5000; // Check every 5 seconds

export class PingService {
    static async start() {
        logger.info('Starting Ping Service...');

        // Initial run
        this.checkHosts();

        pingInterval = setInterval(() => {
            this.checkHosts();
        }, PING_INTERVAL_MS);
    }

    static stop() {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
    }

    static async checkHosts() {
        try {
            const hosts = await ProxyHost.query().where('enabled', 1);

            for (const host of hosts) {
                this.pingHost(host);
            }
        } catch (err) {
            logger.error('PingService Error:', err);
        }
    }

    static pingHost(host) {
        tcpping.ping({
            address: host.forward_host,
            port: host.forward_port,
            attempts: 1,
            timeout: 2000
        }, (err, data) => {
            const status = {
                id: host.id,
                online: false,
                latency: 0,
                timestamp: Date.now()
            };

            if (!err && data.results.length > 0 && !data.results[0].err) {
                status.online = true;
                status.latency = Math.round(data.avg);
            }

            broadcast('host:status', status);
        });
    }
}

class LogWatcher {
    static ensureFiles() {
        const logDir = '/data/logs';
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        [ACCESS_LOG_PATH, ERROR_LOG_PATH].forEach((file) => {
            if (!fs.existsSync(file)) {
                try {
                    fs.writeFileSync(file, '');
                } catch (err) {
                    logger.warn(`Could not create ${file}: ${err.message}`);
                }
            }
        });
    }

    static async loadFilters() {
        try {
            const setting = await Setting.query()
                .where('is_deleted', 0)
                .andWhere('name', 'log-filter-settings')
                .first();

            if (!setting) {
                return { excludePatterns: [], highlightPatterns: [] };
            }

            const meta = setting.meta || {};
            return {
                excludePatterns: Array.isArray(meta.excludePatterns) ? meta.excludePatterns : [],
                highlightPatterns: Array.isArray(meta.highlightPatterns) ? meta.highlightPatterns : [],
            };
        } catch (err) {
            logger.warn('Failed to load log filters:', err.message);
            return { excludePatterns: [], highlightPatterns: [] };
        }
    }

    static matchesPattern(text, patterns = []) {
        if (!text || !patterns.length) return false;
        return patterns.some((p) => {
            try {
                const regex = new RegExp(p, 'i');
                return regex.test(text);
            } catch (err) {
                return false;
            }
        });
    }

    static shouldEmit(entry, filters) {
        const serialized = typeof entry === 'string' ? entry : JSON.stringify(entry);
        if (this.matchesPattern(serialized, filters.excludePatterns)) {
            return false;
        }
        return true;
    }

    static startAccessTail(filters) {
        try {
            accessTail = new Tail(ACCESS_LOG_PATH);
            accessTail.on('line', (line) => {
                let parsed = null;
                try {
                    parsed = JSON.parse(line);
                } catch (err) {
                    logger.debug('Failed to parse access log JSON line');
                }

                const payload = parsed || { raw: line, timestamp: Date.now() };
                if (!this.shouldEmit(payload, filters)) return;

                broadcast('traffic:log', {
                    type: 'access',
                    data: parsed ? {
                        ...parsed,
                        timestamp: parsed.time || new Date().toISOString(),
                        blocked: parsed.status && parsed.status >= 400,
                        highlighted: this.matchesPattern(line, filters.highlightPatterns),
                    } : {
                        raw: line,
                        timestamp: Date.now(),
                        blocked: false,
                        highlighted: this.matchesPattern(line, filters.highlightPatterns),
                    }
                });
            });

            accessTail.on('error', (error) => {
                logger.error('Access LogWatcher Error:', error);
            });

            logger.info(`Access LogWatcher started on ${ACCESS_LOG_PATH}`);
        } catch (err) {
            logger.error('Failed to start Access LogWatcher:', err);
        }
    }

    static startErrorTail(filters) {
        try {
            errorTail = new Tail(ERROR_LOG_PATH);

            errorTail.on('line', (line) => {
                if (!this.shouldEmit(line, filters)) return;

                broadcast('traffic:log', {
                    type: 'error',
                    data: {
                        raw: line,
                        timestamp: Date.now(),
                        highlighted: this.matchesPattern(line, filters.highlightPatterns),
                    }
                });
            });

            errorTail.on('error', (error) => {
                logger.error('Error LogWatcher Error:', error);
            });

            logger.info(`Error LogWatcher started on ${ERROR_LOG_PATH}`);
        } catch (err) {
            logger.error('Failed to start Error LogWatcher:', err);
        }
    }

    static async start() {
        this.ensureFiles();
        const filters = await this.loadFilters();
        this.startAccessTail(filters);
        this.startErrorTail(filters);
    }

    static stop() {
        if (accessTail) {
            accessTail.unwatch();
            accessTail = null;
        }
        if (errorTail) {
            errorTail.unwatch();
            errorTail = null;
        }
    }
}

export default {
    start: () => {
        PingService.start();
        LogWatcher.start();
    },
    stop: () => {
        PingService.stop();
        LogWatcher.stop();
    }
};
