/**
 * controllers/shipmentController.js
 * ─────────────────────────────────────────────────────────────
 * Public shipment tracking for the frontend tracking bar.
 */

'use strict';

const Shipment = require('../models/Shipment');

/**
 * Validates a tracking ID string.
 * Allows only alphanumeric characters and hyphens — rejects
 * any input that could be used for NoSQL injection or log injection.
 *
 * Valid examples:  EV-DEMO0001, EV-8F3A2B1C, ABCD1234
 * Invalid:         <script>alert(1)</script>, ../admin, %00
 *
 * @param {string} id
 * @returns {boolean}
 */
function isValidTrackingId(id) {
  return /^[A-Za-z0-9\-]{4,40}$/.test(id);
}

/**
 * GET /api/track/:trackingId
 *
 * Looks up a shipment by its public tracking ID (case-insensitive).
 * Returns only the customer-safe fields — no internal metadata.
 *
 * Security: The 404 message no longer reflects raw user input back
 * in the response body. Reflecting input is a vector for stored XSS
 * in logs / admin dashboards that display the 404 body.
 */
async function trackShipment(req, res) {
  try {
    const rawId = req.params.trackingId?.trim() ?? '';

    // Input format validation — reject early before hitting the DB
    if (!rawId || !isValidTrackingId(rawId)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid tracking ID format. Tracking IDs contain only letters, numbers, and hyphens (e.g. EV-DEMO0001).',
      });
    }

    // Normalize to uppercase — all stored IDs are uppercase per the schema
    const trackingId = rawId.toUpperCase();

    const shipment = await Shipment.findOne({ trackingId }).lean();

    if (!shipment) {
      // FIX: Do NOT reflect the user-supplied trackingId back in the response.
      // Reflecting unsanitized user input into JSON responses is a low-severity
      // XSS vector when admin dashboards or log aggregators render the body HTML.
      return res.status(404).json({
        success: false,
        message: 'No shipment found for the provided tracking ID. Please check the ID and try again, or call +1 (682) 464-1308.',
      });
    }

    // Return only customer-facing fields — never expose internal DB fields
    return res.status(200).json({
      success: true,
      data: {
        trackingId:        shipment.trackingId,
        currentLocation:   shipment.currentLocation,
        status:            shipment.status,
        estimatedDelivery: shipment.estimatedDelivery,
        originCity:        shipment.originCity || null,
        destinationCity:   shipment.destinationCity || null,
        updatedAt:         shipment.updatedAt,
      },
    });
  } catch (err) {
    console.error('[trackShipment]', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve tracking information. Please try again later.',
    });
  }
}

/**
 * POST /api/admin/shipments  (admin-only, not exposed as a public route)
 * Creates a new shipment record. Used by admin scripts and seeder.
 * Mounted via adminRoutes.js if you add it, or called from seed scripts.
 */
async function createShipment(req, res) {
  try {
    const trackingId =
      req.body.trackingId?.trim().toUpperCase() ||
      Shipment.generateTrackingId();

    const shipment = await Shipment.create({
      trackingId,
      currentLocation:  req.body.currentLocation,
      status:           req.body.status || 'In Transit',
      estimatedDelivery: req.body.estimatedDelivery,
      originCity:       req.body.originCity,
      destinationCity:  req.body.destinationCity,
      customerEmail:    req.body.customerEmail,
    });

    return res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    console.error('[createShipment]', err);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A shipment with this tracking ID already exists.',
      });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create shipment record.',
    });
  }
}

module.exports = { trackShipment, createShipment };
