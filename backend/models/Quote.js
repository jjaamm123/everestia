/**
 * models/Quote.js
 * ─────────────────────────────────────────────────────────────
 * Mongoose schema for freight quote requests submitted via
 * the public SPA contact / quote calculator form.
 *
 * Frontend field `serviceType` is normalized to `serviceNeeded`
 * before persistence (see controllers/quoteController.js).
 */

const mongoose = require('mongoose');

/** Six core logistics services offered by Everestia Ventures LLC */
const SERVICE_NEEDED = [
  'Full Truckload (FTL)',
  'Less Than Truckload (LTL)',
  'Last-Mile Delivery',
  'Temperature-Controlled',
  'Long-Haul / Interstate',
  'Warehousing & Storage',
];

/** Admin workflow statuses for internal dashboard */
const QUOTE_STATUS = ['Pending', 'Reviewed', 'Responded'];

const quoteSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [120, 'Full name cannot exceed 120 characters'],
    },

    company: {
      type: String,
      trim: true,
      maxlength: [160, 'Company name cannot exceed 160 characters'],
      default: '',
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    originCity: {
      type: String,
      required: [true, 'Origin city is required'],
      trim: true,
      maxlength: [120, 'Origin cannot exceed 120 characters'],
    },

    destinationCity: {
      type: String,
      required: [true, 'Destination city is required'],
      trim: true,
      maxlength: [120, 'Destination cannot exceed 120 characters'],
    },

    /**
     * Maps to frontend <select id="serviceType"> after normalization.
     * Stored as human-readable service labels for admin readability.
     */
    serviceNeeded: {
      type: String,
      required: [true, 'Service type is required'],
      enum: {
        values: SERVICE_NEEDED,
        message: '{VALUE} is not a valid service option',
      },
    },

    message: {
      type: String,
      trim: true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
      default: '',
    },

    /** Optional extras from the multi-step form (not required by business rules) */
    weight: {
      type: Number,
      min: [1, 'Weight must be at least 1 lb'],
      max: [80000, 'Weight cannot exceed 80,000 lbs'],
    },

    pickupDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: {
        values: QUOTE_STATUS,
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Newest quotes first — common admin dashboard sort */
quoteSchema.index({ createdAt: -1 });
quoteSchema.index({ status: 1, createdAt: -1 });
quoteSchema.index({ email: 1 });

module.exports = mongoose.model('Quote', quoteSchema);
module.exports.SERVICE_NEEDED = SERVICE_NEEDED;
module.exports.QUOTE_STATUS = QUOTE_STATUS;
