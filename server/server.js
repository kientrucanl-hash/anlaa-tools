require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./logger');
const jwt = require('jsonwebtoken');

// Validate required env vars on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be set and at least 32 characters. Server will not start.');
    process.exit(1);
}

// Load DB (auto-initializes and seeds on first run)
require('./db/database');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Socket.io setup
const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
});

// Auth middleware for socket connections
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = payload;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`[Socket] Connected: ${user.username} (${socket.id})`);

    // Join personal room for direct notifications
    socket.join(`user:${user.id}`);

    // Send unread count on connect so badge updates immediately
    try {
        const db = require('./db/database');
        const unread = db.notifications.unreadCount(user.id);
        if (unread > 0) socket.emit('notification:unread_count', { count: unread });
    } catch (_) {}

    // Join project room when user opens a project
    socket.on('project:join', ({ projectId }) => {
        if (!projectId) return;
        socket.join(`project:${projectId}`);
        // Announce presence to others in the room
        socket.to(`project:${projectId}`).emit('presence:joined', {
            userId: user.id, username: user.username,
        });
        // Send back who else is in the room
        const room = io.sockets.adapter.rooms.get(`project:${projectId}`);
        const presenceList = [];
        if (room) {
            room.forEach(sid => {
                const s = io.sockets.sockets.get(sid);
                if (s && s.user && s.id !== socket.id) {
                    presenceList.push({ userId: s.user.id, username: s.user.username });
                }
            });
        }
        socket.emit('presence:list', presenceList);
        socket.data.currentProject = projectId;
    });

    // Leave project room
    socket.on('project:leave', ({ projectId }) => {
        socket.leave(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('presence:left', {
            userId: user.id, username: user.username,
        });
    });

    // Cursor/focus broadcast — user is editing a row
    socket.on('cursor:move', ({ projectId, itemId, rowIdx }) => {
        socket.to(`project:${projectId}`).emit('cursor:update', {
            userId: user.id, username: user.username, itemId, rowIdx,
        });
    });

    // Broadcast data changes to other collaborators
    socket.on('project:changed', ({ projectId, patch }) => {
        socket.to(`project:${projectId}`).emit('project:remote_change', {
            userId: user.id, username: user.username, patch,
        });
    });

    socket.on('disconnect', () => {
        logger.info(`[Socket] Disconnected: ${user.username}`);
        const projectId = socket.data.currentProject;
        if (projectId) {
            socket.to(`project:${projectId}`).emit('presence:left', {
                userId: user.id, username: user.username,
            });
        }
    });
});

// Make io accessible to routes
app.set('io', io);

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Allow CDN scripts in frontend
}));

// CORS — restrict to configured origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : false;
app.use(cors(allowedOrigins ? { origin: allowedOrigins, credentials: true } : {}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware (API routes only)
app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info('API request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ms: Date.now() - start,
            ip: req.ip,
        });
    });
    next();
});

// Rate limit login endpoint (max 10 attempts per 15 minutes per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Health check endpoint
app.get('/health', (_, res) => {
    res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

// Serve static frontend files from parent directory with HTML cache control
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, filePath) => {
        const baseName = path.basename(filePath);
        if (baseName === 'index.html' || baseName.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/collaboration', require('./routes/collaboration'));
app.use('/api/contractors', require('./routes/contractors'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/prices', require('./routes/prices'));

// SPA fallback — serve index.html for non-API routes with explicit cache-control
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
    res.status(500).json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' });
});

httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`Dự toán ANLAA running on port ${PORT} (WebSocket enabled)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    httpServer.close(() => process.exit(0));
});
