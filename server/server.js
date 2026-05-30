require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./logger');

// Validate required env vars on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be set and at least 32 characters. Server will not start.');
    process.exit(1);
}

// Load DB (auto-initializes and seeds on first run)
require('./db/database');

const app = express();
const PORT = process.env.PORT || 4000;

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

// Serve static frontend files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
    res.status(500).json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Dự toán ANLAA running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    server.close(() => process.exit(0));
});
