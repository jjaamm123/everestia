/**
 * routes/shipmentRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Public shipment tracking (frontend tracking bar).
 */

const express = require('express');
const { trackShipment } = require('../controllers/shipmentController');

const router = express.Router();

/**
 * @route   GET /api/track/:trackingId
 * @desc    Lookup shipment status by tracking ID
 * @access  Public
 */
router.get('/:trackingId', trackShipment);

module.exports = router;
