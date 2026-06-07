/**
 * controllers/quoteController.js
 * ─────────────────────────────────────────────────────────────
 * Business logic for public quote submissions and admin CRUD.
 */

const Quote = require('../models/Quote');
const { SERVICE_NEEDED, QUOTE_STATUS } = require('../models/Quote');
const {
  sendQuoteConfirmationToCustomer,
  sendQuoteAlertToAdmin,
} = require('../utils/emailService');

/**
 * Maps frontend <select> values (serviceType) to stored serviceNeeded labels.
 * Also accepts human-readable labels if sent directly.
 */
const SERVICE_TYPE_MAP = {
  FTL: 'Full Truckload (FTL)',
  LTL: 'Less Than Truckload (LTL)',
  lastmile: 'Last-Mile Delivery',
  temperature: 'Temperature-Controlled',
  longhaul: 'Long-Haul / Interstate',
  warehousing: 'Warehousing & Storage',
};

function normalizeServiceNeeded(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (SERVICE_TYPE_MAP[trimmed]) return SERVICE_TYPE_MAP[trimmed];
  if (SERVICE_NEEDED.includes(trimmed)) return trimmed;
  return null;
}

/**
 * Validates and sanitizes inbound quote payload from POST /api/quotes.
 * Returns { data, errors } — errors is a string array when invalid.
 */
function validateQuotePayload(body) {
  const errors = [];

  const fullName = body.fullName?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim().toLowerCase();
  const originCity = body.originCity?.trim();
  const destinationCity = body.destinationCity?.trim();
  const message = body.message?.trim() || '';

  if (!fullName) errors.push('fullName is required');
  if (!phone) errors.push('phone is required');
  else if (!/^[+]?[0-9\s\-().]{7,30}$/.test(phone)) {
    errors.push('phone format is invalid');
  }

  if (!email) errors.push('email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email format is invalid');
  }

  if (!originCity) errors.push('originCity is required');
  if (!destinationCity) errors.push('destinationCity is required');

  // Frontend sends serviceType; API spec uses serviceNeeded — accept both
  const serviceRaw = body.serviceNeeded || body.serviceType;
  const serviceNeeded = normalizeServiceNeeded(serviceRaw);
  if (!serviceNeeded) {
    errors.push(
      'serviceNeeded (or serviceType) must be one of the six core services'
    );
  }

  let weight;
  if (body.weight !== undefined && body.weight !== '' && body.weight !== null) {
    weight = Number(body.weight);
    if (Number.isNaN(weight) || weight < 1 || weight > 80000) {
      errors.push('weight must be a number between 1 and 80,000');
    }
  }

  let pickupDate;
  if (body.pickupDate) {
    pickupDate = new Date(body.pickupDate);
    if (Number.isNaN(pickupDate.getTime())) {
      errors.push('pickupDate is not a valid date');
    }
  }

  if (errors.length) return { data: null, errors };

  const data = {
    fullName,
    company: body.company?.trim() || '',
    phone,
    email,
    originCity,
    destinationCity,
    serviceNeeded,
    message,
  };

  if (weight !== undefined) data.weight = weight;
  if (pickupDate) data.pickupDate = pickupDate;

  return { data, errors: [] };
}

/**
 * POST /api/quotes
 * Public — create quote, persist, send emails.
 */
async function createQuote(req, res) {
  try {
    const { data, errors } = validateQuotePayload(req.body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const quote = await Quote.create(data);

    // Email delivery is best-effort — do not fail the HTTP request if SMTP fails
    const emailResults = { customer: null, admin: null, emailErrors: [] };

    try {
      emailResults.customer = await sendQuoteConfirmationToCustomer(quote);
    } catch (mailErr) {
      console.error('[createQuote] Customer email failed:', mailErr.message);
      emailResults.emailErrors.push('customer_confirmation_failed');
    }

    try {
      emailResults.admin = await sendQuoteAlertToAdmin(quote);
    } catch (mailErr) {
      console.error('[createQuote] Admin email failed:', mailErr.message);
      emailResults.emailErrors.push('admin_alert_failed');
    }

    return res.status(201).json({
      success: true,
      message:
        'Quote request received. Our team will contact you within one hour.',
      data: {
        id: quote._id,
        status: quote.status,
        createdAt: quote.createdAt,
      },
      emailResults,
    });
  } catch (err) {
    console.error('[createQuote]', err);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Database validation failed',
        errors: messages,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to process quote request. Please try again later.',
    });
  }
}

/**
 * GET /api/admin/quotes
 * Admin — list all quotes, newest first.
 */
async function getAllQuotes(req, res) {
  try {
    const { status, limit = '50', page = '1' } = req.query;

    const filter = {};
    if (status && QUOTE_STATUS.includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [quotes, total] = await Promise.all([
      Quote.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Quote.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: quotes,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('[getAllQuotes]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quote requests.',
    });
  }
}

/**
 * PATCH /api/admin/quotes/:id/status
 * Admin — update workflow status.
 */
async function updateQuoteStatus(req, res) {
  try {
    const { status } = req.body;

    if (!status || !QUOTE_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${QUOTE_STATUS.join(', ')}`,
      });
    }

    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Quote status updated.',
      data: quote,
    });
  } catch (err) {
    console.error('[updateQuoteStatus]', err);

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid quote ID format.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update quote status.',
    });
  }
}

/**
 * DELETE /api/admin/quotes/:id
 * Admin — permanently remove a quote.
 */
async function deleteQuote(req, res) {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Quote request deleted.',
      data: { id: quote._id },
    });
  } catch (err) {
    console.error('[deleteQuote]', err);

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid quote ID format.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete quote request.',
    });
  }
}

module.exports = {
  createQuote,
  getAllQuotes,
  updateQuoteStatus,
  deleteQuote,
  validateQuotePayload,
  normalizeServiceNeeded,
};
