/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────
 * Mongoose connection factory for Everestia Ventures LLC API.
 *
 * Exported as an async function so server.js can await the
 * connection before binding the HTTP server — preventing the
 * server from accepting requests before the DB is ready.
 *
 * Usage:
 *   const connectDB = require('./config/db');
 *   await connectDB();
 */

const mongoose = require('mongoose');

/**
 * Establishes a Mongoose connection to MongoDB.
 * Exits the process with code 1 on unrecoverable failure so
 * process managers (PM2, Docker, systemd) will restart cleanly.
 *
 * @returns {Promise<mongoose.Connection>} The active connection object.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/everestia_ventures';

  // Mongoose 7+ uses the native driver's connection pool by default.
  // These options are explicit overrides for production stability.
  const options = {
    // How long the driver waits to establish a new connection before timing out (ms)
    serverSelectionTimeoutMS: 8000,
    // How long a MongoDB operation can block the socket before timing out (ms)
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(uri, options);

    console.log(
      `[MongoDB] Connected to "${conn.connection.name}" on ${conn.connection.host}:${conn.connection.port}`
    );

    return conn.connection;
  } catch (err) {
    // Log the full error in development; mask the URI in production to avoid leaking credentials
    const displayUri =
      process.env.NODE_ENV === 'production'
        ? uri.replace(/\/\/[^@]+@/, '//<credentials>@') // hide user:pass in Atlas URIs
        : uri;

    console.error(`[MongoDB] Connection failed — URI: ${displayUri}`);
    console.error(`[MongoDB] Error: ${err.message}`);

    // Hard exit — allow the process manager to restart with a clean state
    process.exit(1);
  }
}

/**
 * Registers Mongoose connection event listeners for operational visibility.
 * Call this once at startup (after connectDB) for production log monitoring.
 */
function registerMongooseEvents() {
  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database.');
  });

  mongoose.connection.on('reconnected', () => {
    console.info('[MongoDB] Reconnected to database.');
  });

  mongoose.connection.on('error', (err) => {
    // Log but do not exit — Mongoose will attempt to reconnect automatically
    console.error('[MongoDB] Connection error:', err.message);
  });
}

module.exports = connectDB;
module.exports.registerMongooseEvents = registerMongooseEvents;
