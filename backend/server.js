/**
 * server.js — Everestia Ventures LLC API
 * ═══════════════════════════════════════════════════════════════
 * Express entry point: middleware stack, rate limiting, route
 * mounting, error handling, and graceful startup/shutdown.
 *
 * Architecture: MVC
 *   Models      → models/Quote.js, models/Shipment.js
 *   Controllers → controllers/quoteController.js, controllers/shipmentController.js
 *   Routes      → routes/quoteRoutes.js, routes/shipmentRoutes.js, routes/adminRoutes.js
 *   Config      → config/db.js  (Mongoose connection)
 *   Utils       → utils/emailService.js (Nodemailer)
 *
 * Start:
 *   npm run dev     → nodemon (hot-reload)
 *   npm start       → node (production)
 */

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const mongoose     = require('mongoose');
const connectDB    = require('./config/db');
const { registerMongooseEvents } = require('./config/db');

const quoteRoutes    = require('./routes/quoteRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const authRoutes     = require('./routes/authRoutes');
const { verifyConnection } = require('./utils/emailService');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ─────────────────────────────────────────────────────────────
   CORS
   Reads CLIENT_URL from .env — supports comma-separated list.
   "null" is accepted in development to allow file:// origins
   (when opening index.html directly without a dev server).
───────────────────────────────────────────────────────────── */
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5500,http://localhost:5500')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (Postman, cURL) send no Origin header — allow them
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // file:// pages appear as origin "null" in Chromium/Firefox
      if (origin === 'null' && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-api-key'],
    credentials:    true,
  })
);

/* ─────────────────────────────────────────────────────────────
   RATE LIMITING
   Protects all /api/* routes from brute-force and DoS abuse.

   Quotas (per IP, sliding window):
     General API  → 120 requests / 15 min
     Quote POST   → 10  requests / 15 min  (spam protection)
     Track GET    → 30  requests / 5  min  (moderate usage)
───────────────────────────────────────────────────────────── */

/** Applied globally to all /api/ routes */
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              120,
  standardHeaders:  true,           // Return rate limit info in RateLimit-* headers
  legacyHeaders:    false,          // Disable X-RateLimit-* (deprecated)
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
});

/** Stricter limiter for quote submission — prevents email spam */
const quoteLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    success: false,
    message: 'Too many quote requests from this IP. Please wait 15 minutes before submitting again.',
  },
  // Skip successful requests from counting toward the limit (only failed/valid submissions count)
  skipSuccessfulRequests: false,
});

/** Moderate limiter for public tracking lookups */
const trackLimiter = rateLimit({
  windowMs:         5 * 60 * 1000, // 5 minutes
  max:              30,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    success: false,
    message: 'Too many tracking requests. Please wait 5 minutes.',
  },
});

// Apply global API rate limiter to all /api/* paths
app.use('/api', apiLimiter);

/* ─────────────────────────────────────────────────────────────
   CORE MIDDLEWARE
───────────────────────────────────────────────────────────── */
// JSON body parser — 32kb limit prevents large payload attacks
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// Trust first proxy — required for express-rate-limit to read real IP
// behind Nginx, Cloudflare, or Railway/Render reverse proxies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

/** Development request logger — concise, single-line format */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

/* ─────────────────────────────────────────────────────────────
   HEALTH CHECK
   Used by uptime monitors, load balancers, and Docker HEALTHCHECK.
   Not rate-limited so monitors don't get blocked.
───────────────────────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  const dbState  = mongoose.connection.readyState;
  const dbLabels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(200).json({
    success:   true,
    service:   'Everestia Ventures API',
    version:   '1.0.0',
    database:  dbLabels[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────────────────────
   API ROUTES (MVC)
   Route-specific limiters are applied inline before controllers.
───────────────────────────────────────────────────────────── */
app.use('/api/quotes',  quoteLimiter,  quoteRoutes);    // POST /api/quotes
app.use('/api/track',   trackLimiter,  shipmentRoutes); // GET  /api/track/:trackingId
app.use('/api/admin',                  adminRoutes);    // GET/PATCH/DELETE /api/admin/quotes/*
app.use('/api/auth',                   authRoutes);

/* ─────────────────────────────────────────────────────────────
   404 — unknown /api/* paths
───────────────────────────────────────────────────────────── */
app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

/* ─────────────────────────────────────────────────────────────
   GLOBAL ERROR HANDLER
   Catches errors thrown by any middleware or route handler.
   Must have 4 parameters (err, req, res, next) — Express requires it.
───────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[GlobalError]', err.message);

  // CORS rejection
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Malformed JSON body (SyntaxError from express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body exceeds size limit.' });
  }

  return res.status(500).json({ success: false, message: 'Internal server error.' });
});

/* ─────────────────────────────────────────────────────────────
   STARTUP — connects to MongoDB, verifies SMTP, then boots HTTP
───────────────────────────────────────────────────────────── */
async function startServer() {
  try {
    // 1. Connect to MongoDB via the isolated config module
    await connectDB();
    registerMongooseEvents();

    // 2. Verify SMTP (non-fatal — app runs without email if unconfigured)
    const smtpOk = await verifyConnection();
    console.log(
      smtpOk
        ? '[Email] SMTP connection verified ✓'
        : '[Email] SMTP not configured — emails will be skipped'
    );

    // 3. Start HTTP server
    app.listen(PORT, () => {
      console.log(`\n[Server] Everestia Ventures API is running`);
      console.log(`         → http://localhost:${PORT}/api/health`);
      console.log(`         → http://localhost:${PORT}/api/quotes (POST)`);
      console.log(`         → http://localhost:${PORT}/api/track/:id (GET)\n`);
    });
  } catch (err) {
    // connectDB() exits on failure, but guard here for unexpected throw
    console.error('[Startup] Unexpected error:', err.message);
    process.exit(1);
  }
}

/* ─────────────────────────────────────────────────────────────
   GRACEFUL SHUTDOWN
   Closes the Mongoose connection cleanly when the process receives
   SIGINT (Ctrl+C) or SIGTERM (from process managers / Docker stop).
───────────────────────────────────────────────────────────── */
async function gracefulShutdown(signal) {
  console.log(`\n[Server] ${signal} received. Closing connections...`);
  await mongoose.connection.close();
  console.log('[MongoDB] Connection closed. Goodbye.');
  process.exit(0);
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

// Export for integration testing (supertest / jest)
module.exports = app;
