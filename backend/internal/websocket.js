import { Server } from 'socket.io';
import { global as logger } from '../logger.js';
import jwt from 'jsonwebtoken';

let io;

export function initWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*', // Allow all origins for now, restrict in production
            methods: ['GET', 'POST']
        }
    });

    io.use((socket, next) => {
        if (socket.handshake.auth && socket.handshake.auth.token) {
            jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET || 'better-npm-secret', (err, decoded) => {
                if (err) return next(new Error('Authentication error'));
                socket.decoded = decoded;
                next();
            });
        } else {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`WebSocket client connected: ${socket.id} (User: ${socket.decoded.email})`);

        socket.on('disconnect', () => {
            logger.info(`WebSocket client disconnected: ${socket.id}`);
        });
    });

    logger.info('WebSocket server initialized');
    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('WebSocket not initialized!');
    }
    return io;
}

export function broadcast(event, data) {
    if (io) {
        io.emit(event, data);
    }
}
