import express from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/system/info
 * Get system resource information (CPU, memory, disk)
 */
router.get('/info', async (req, res, next) => {
    try {
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        // CPU usage calculation
        const cpuCount = cpus.length;
        const cpuModel = cpus[0]?.model || 'Unknown';

        // Calculate average CPU load (1 min, 5 min, 15 min)
        const loadAverage = os.loadavg();
        const cpuUsage = (loadAverage[0] / cpuCount * 100).toFixed(2);

        // Get disk usage of root or current directory
        let diskUsage = null;
        try {
            const stats = fs.statfsSync('/');
            const diskTotal = stats.blocks * stats.bsize;
            const diskFree = stats.bavail * stats.bsize;
            const diskUsed = diskTotal - diskFree;
            
            diskUsage = {
                total: diskTotal,
                used: diskUsed,
                free: diskFree,
                percentage: (diskUsed / diskTotal * 100).toFixed(2)
            };
        } catch (err) {
            // If statfsSync fails, try alternate method
            diskUsage = {
                total: 0,
                used: 0,
                free: 0,
                percentage: 0
            };
        }

        // Uptime in seconds
        const uptime = os.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeString = `${uptimeHours}시간 ${uptimeMinutes}분`;

        // Platform info
        const platform = os.platform();
        const arch = os.arch();
        const nodeVersion = process.version;

        res.json({
            cpu: {
                model: cpuModel,
                cores: cpuCount,
                usage: parseFloat(cpuUsage),
                load: {
                    avg1min: loadAverage[0].toFixed(2),
                    avg5min: loadAverage[1].toFixed(2),
                    avg15min: loadAverage[2].toFixed(2)
                }
            },
            memory: {
                total: totalMemory,
                used: usedMemory,
                free: freeMemory,
                percentage: (usedMemory / totalMemory * 100).toFixed(2)
            },
            disk: diskUsage,
            system: {
                uptime: uptime,
                uptimeString: uptimeString,
                platform: platform,
                arch: arch,
                hostname: os.hostname()
            },
            node: {
                version: nodeVersion,
                memory: process.memoryUsage()
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

export default router;
