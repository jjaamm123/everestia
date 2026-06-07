/**
 * routes/quoteRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Public quote submission endpoint (SPA contact / quote form).
 */

const express = require('express');
const { createQuote } = require('../controllers/quoteController');

const router = express.Router();

/**
 * @route   POST /api/quotes
 * @desc    Submit a new freight quote request
 * @access  Public
 */
router.post('/', createQuote);

module.exports = router;
