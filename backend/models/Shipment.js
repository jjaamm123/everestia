/**
 * models/Shipment.js
 * ─────────────────────────────────────────────────────────────
 * Tracks live shipment status for the public tracking bar
 * (GET /api/track/:trackingId).
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/** Shipment lifecycle states exposed to customers */
const SHIPMENT_STATUS = [
  'Label Created',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Exception',
  'On Hold',
];

const shipmentSchema = new mongoose.Schema(
  {
    /**
     * Public-facing tracking reference (e.g. EV-8F3A2B1C).
     * Unique index ensures fast lookups from the tracking form.
     */
    trackingId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    currentLocation: {
      type: String,
      required: [true, 'Current location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },

    status: {
      type: String,
      required: true,
      enum: {
        values: SHIPMENT_STATUS,
        message: '{VALUE} is not a valid shipment status',
      },
      default: 'In Transit',
    },

    estimatedDelivery: {
      type: Date,
      required: [true, 'Estimated delivery date is required'],
    },

    /** Optional internal metadata */
    originCity: { type: String, trim: true },
    destinationCity: { type: String, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
  },
  {
    timestamps: true,
  }
);

/**
 * Static helper — generates a branded, URL-safe tracking ID.
 * Format: EV- + 8 hex chars (uppercase).
 */
shipmentSchema.statics.generateTrackingId = function generateTrackingId() {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `EV-${suffix}`;
};

module.exports = mongoose.model('Shipment', shipmentSchema);
module.exports.SHIPMENT_STATUS = SHIPMENT_STATUS;
