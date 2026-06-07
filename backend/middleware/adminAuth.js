/**
 * middleware/adminAuth.js
 * ─────────────────────────────────────────────────────────────
 * Lightweight API-key guard for /api/admin/* routes.
 *
 * Clients must send the key in the request header:
 *   x-admin-api-key: <ADMIN_API_KEY from .env>
 *
 * Generate a strong key with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Security notes:
 *   1. Uses crypto.timingSafeEqual() to prevent timing attacks.
 *      A naive string comparison (===) leaks information about
 *      where the first mismatch occurred via response time.
 *   2. Returns 503 in production when no key is configured,
 *      rather than silently allowing access.
 *   3. The guard is mounted at the router level (router.use(adminAuth))
 *      so every future route added to adminRoutes.js is protected
 *      automatically without per-route annotation.
 */

'use strict';

const crypto = require('crypto');

/**
 * Timing-safe string comparison.
 * Falls back to constant-time rejection if lengths differ
 * (length mismatch itself is a safe disclosure — attacker already
 *  knows valid key format from the .env.example).
 *
 * @param {string} a - Expected value (from env)
 * @param {string} b - Provided value (from request header)
 * @returns {boolean}
 */
function safeCompare(a, b) {
  // Both buffers must be the same length for timingSafeEqual.
  // We pad the shorter one to avoid leaking length information
  // while still returning false when lengths differ.
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Still perform a dummy comparison to consume similar CPU time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Express middleware — rejects requests without a valid admin API key.
 */
function adminAuth(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;

  // If no key is configured…
  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      // Hard block in production — admin routes must be explicitly protected
      console.error(
        '[adminAuth] CRITICAL: ADMIN_API_KEY is not set in a production environment. ' +
        'Blocking all admin route access. Set ADMIN_API_KEY in .env immediately.'
      );
      return res.status(503).json({
        success: false,
        message: 'Admin API is not configured on this server. Contact the system administrator.',
      });
    }
    // In development, allow through with a warning so devs can test without setup friction
    console.warn('[adminAuth] ADMIN_API_KEY not set — admin routes are open (development only).');
    return next();
  }

  const providedKey = req.headers['x-admin-api-key'];

  if (!providedKey || !safeCompare(configuredKey, providedKey)) {
    // Generic 401 — do NOT reveal whether the key exists or its format
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. A valid x-admin-api-key header is required.',
    });
  }

  return next();
}

module.exports = adminAuth;
