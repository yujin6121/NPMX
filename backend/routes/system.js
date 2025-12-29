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

        // CPU usage calculation (container-aware)
        const cpuCount = cpus.length;
        const cpuModel = cpus[0]?.model || 'Unknown';
        // loadAverage used in response; compute once so it's defined in all code paths
        const loadAverage = os.loadavg();

        // Keep a small in-memory snapshot to compute deltas between requests
        // This allows us to compute a % in the 0..100 range for containers (via cgroup)
        // or fall back to host-wide CPU usage using os.cpus() deltas.
        // NOTE: values are stored in nanoseconds for compatibility.
        if (typeof global.__cpuSnapshot === 'undefined') {
            global.__cpuSnapshot = {
                lastTotalNs: null,
                lastIdleNs: null,
                lastCgroupNs: null,
                lastTs: Date.now()
            };
        }

        const nowTs = Date.now();

        // Helpers
        const readFileSafe = (p) => {
            try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; }
        };

        const getCgroupInfo = () => {
            if (process.platform !== 'linux') return null;
            const cgroup = readFileSafe('/proc/self/cgroup');
            if (!cgroup) return null;
            const isV2 = fs.existsSync('/sys/fs/cgroup/cgroup.controllers');
            if (isV2) {
                // v2: single unified hierarchy, line like: 0::/docker/<id>
                const m = cgroup.split('\n').find(l => l.startsWith('0::'));
                const path = m ? m.split(':')[2] : '/';
                return { version: 2, path };
            } else {
                // v1: find cpuacct or cpu controller line
                const m = cgroup.split('\n').find(l => /cpuacct|cpu/.test(l));
                if (!m) return null;
                const parts = m.split(':');
                // parts[1] contains controllers, parts[2] is path
                return { version: 1, controllers: parts[1], path: parts[2] };
            }
        };

        const readCgroupUsageNs = () => {
            const info = getCgroupInfo();
            if (!info) return null;
            if (info.version === 2) {
                const stat = readFileSafe(path.join('/sys/fs/cgroup', info.path, 'cpu.stat')) || '';
                // cpu.stat usually contains 'usage_usec <num>' (microseconds)
                const m = stat.match(/usage_usec\s+(\d+)/);
                if (m) return parseInt(m[1], 10) * 1000; // usec -> nsec
                // fallback: some systems may expose 'usage' in ns
                const m2 = stat.match(/usage\s+(\d+)/);
                if (m2) return parseInt(m2[1], 10);
                return null;
            } else {
                // v1: cpuacct.usage is in nanoseconds
                // Try common mount points
                const candidates = [
                    path.join('/sys/fs/cgroup/cpuacct', info.path, 'cpuacct.usage'),
                    path.join('/sys/fs/cgroup/cpu,cpuacct', info.path, 'cpuacct.usage'),
                    path.join('/sys/fs/cgroup', info.path, 'cpuacct.usage')
                ];
                for (const p of candidates) {
                    const v = readFileSafe(p);
                    if (v) return parseInt(v.trim(), 10);
                }
                return null;
            }
        };

        const getTotalAndIdleNs = () => {
            const cpusLocal = os.cpus();
            let totalMs = 0;
            let idleMs = 0;
            cpusLocal.forEach(c => {
                const t = c.times;
                totalMs += (t.user + t.nice + t.sys + t.idle + t.irq);
                idleMs += t.idle;
            });
            return { totalNs: totalMs * 1e6, idleNs: idleMs * 1e6 };
        };

        const cgroupNs = readCgroupUsageNs();
        const { totalNs, idleNs } = getTotalAndIdleNs();

        let usagePct = null;
        const snap = global.__cpuSnapshot;

        if (snap.lastTotalNs !== null) {
            const totalDelta = totalNs - snap.lastTotalNs;
            if (totalDelta > 0) {
                if (cgroupNs !== null && snap.lastCgroupNs !== null) {
                    const containerDelta = cgroupNs - snap.lastCgroupNs;
                    usagePct = (containerDelta / totalDelta) * 100; // already relative to all CPUs
                } else {
                    // fallback: host-wide busy percent
                    const idleDelta = idleNs - snap.lastIdleNs;
                    const busyDelta = totalDelta - idleDelta;
                    usagePct = (busyDelta / totalDelta) * 100;
                }
            }
        } else {
            // First-time: fallback to loadavg-derived estimate to avoid returning null
            usagePct = (loadAverage[0] / cpuCount * 100);
        }

        // Save snapshot for next request
        snap.lastTotalNs = totalNs;
        snap.lastIdleNs = idleNs;
        snap.lastCgroupNs = cgroupNs !== null ? cgroupNs : snap.lastCgroupNs;
        snap.lastTs = nowTs;

        // Ensure a number between 0 and 100
        const cpuUsage = Math.max(0, Math.min(100, Number((usagePct || 0).toFixed(2))));

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
