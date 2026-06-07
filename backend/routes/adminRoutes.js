/**
 * routes/adminRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Admin dashboard CRUD for managing inbound quote requests.
 *
 * Protected by adminAuth middleware (x-admin-api-key header).
 * Mounted at /api/admin in server.js
 */

const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const {
  getAllQuotes,
  updateQuoteStatus,
  deleteQuote,
} = require('../controllers/quoteController');

const router = express.Router();

router.use(adminAuth);

/**
 * @route   GET /api/admin/quotes
 * @desc    List quote requests (newest first)
 * @query   ?status=Pending&page=1&limit=50
 * @access  Admin
 */
router.get('/quotes', getAllQuotes);

/**
 * @route   PATCH /api/admin/quotes/:id/status
 * @desc    Update quote workflow status
 * @body    { "status": "Reviewed" | "Responded" | "Pending" }
 * @access  Admin
 */
router.patch('/quotes/:id/status', updateQuoteStatus);

/**
 * @route   DELETE /api/admin/quotes/:id
 * @desc    Remove a quote request
 * @access  Admin
 */
router.delete('/quotes/:id', deleteQuote);

module.exports = router;
