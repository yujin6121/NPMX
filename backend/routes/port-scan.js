import express from 'express';
import net from 'net';

const router = express.Router();

// 포트별 서비스 정보
const getPortInfo = (port) => {
    const portMap = {
        20: { name: 'FTP Data', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
        21: { name: 'FTP Control', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
        22: { name: 'SSH', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        23: { name: 'Telnet', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
        25: { name: 'SMTP', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        53: { name: 'DNS', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
        80: { name: 'HTTP', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        110: { name: 'POP3', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        143: { name: 'IMAP', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        443: { name: 'HTTPS', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        465: { name: 'SMTPS', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        587: { name: 'SMTP/TLS', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        993: { name: 'IMAPS', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        995: { name: 'POP3S', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        1433: { name: 'MSSQL', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
        3000: { name: 'Node.js/React', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
        3001: { name: 'Node.js Alt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
        3306: { name: 'MySQL', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
        4200: { name: 'Angular', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
        5000: { name: 'Flask/Docker', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        5173: { name: 'Vite Dev', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
        5432: { name: 'PostgreSQL', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        6379: { name: 'Redis', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
        8000: { name: 'Django/HTTP', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        8080: { name: 'HTTP Proxy', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        8081: { name: 'HTTP Alt', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        8443: { name: 'HTTPS Alt', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
        8888: { name: 'HTTP/Jupyter', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
        9000: { name: 'PHP-FPM', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
        9090: { name: 'Prometheus', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
        27017: { name: 'MongoDB', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
    };
    return portMap[port] || { name: 'Unknown', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' };
};

// 단일 포트 스캔
const scanPort = (host, port, timeout = 2000) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let isResolved = false;

        const cleanup = () => {
            if (!isResolved) {
                isResolved = true;
                socket.destroy();
            }
        };

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            cleanup();
            const portInfo = getPortInfo(port);
            resolve({
                host,
                port,
                scheme: (port === 443 || port === 8443) ? 'https' : 'http',
                status: 'open',
                serviceName: portInfo.name,
                serviceColor: portInfo.color
            });
        });

        socket.on('timeout', () => {
            cleanup();
            resolve(null);
        });

        socket.on('error', () => {
            cleanup();
            resolve(null);
        });

        socket.connect(port, host);
    });
};

// POST /api/port-scan
router.post('/', async (req, res) => {
    try {
        const { target } = req.body;

        if (!target) {
            return res.status(400).json({ error: 'Target IP address is required' });
        }

        // 주요 포트 목록
        const commonPorts = [
            80, 443, 8080, 8443,           // 웹 서버
            3000, 3001, 5000, 5173, 8000,  // 개발 서버
            4200, 8081, 8888, 9000, 9090,  // 기타 웹
            3306, 5432, 6379, 27017,       // 데이터베이스
            22, 21                          // SSH, FTP
        ];

        // 병렬로 포트 스캔
        const scanPromises = commonPorts.map(port => scanPort(target, port, 2000));
        const results = await Promise.all(scanPromises);

        // null이 아닌 결과만 필터링 (열린 포트만)
        const openPorts = results.filter(r => r !== null);

        res.json({
            target,
            scanned: commonPorts.length,
            found: openPorts.length,
            ports: openPorts
        });

    } catch (error) {
        console.error('Port scan error:', error);
        res.status(500).json({ error: 'Port scan failed' });
    }
});

export default router;
