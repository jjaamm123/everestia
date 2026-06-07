/**
 * utils/emailService.js
 * ─────────────────────────────────────────────────────────────
 * Centralized Nodemailer transporter and branded HTML email
 * templates for Everestia Ventures LLC.
 *
 * Security note:
 *   All user-supplied data (fullName, email, originCity, etc.)
 *   is HTML-escaped via escapeHtml() before injection into
 *   template strings. This prevents stored XSS in admin inboxes
 *   and webmail clients that render HTML emails.
 *
 * Transporter:
 *   Lazily instantiated on first call and cached for the
 *   process lifetime (singleton pattern — avoids connection
 *   pool exhaustion under load).
 */

'use strict';

const nodemailer = require('nodemailer');

/* ── SMTP singleton ──────────────────────────────────────── */
let _transporter = null;

/**
 * Returns the cached SMTP transporter, or creates it from .env vars.
 * Returns null (and logs a warning) when SMTP is not configured,
 * allowing the application to run without email support in development.
 *
 * @returns {nodemailer.Transporter|null}
 */
function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '[emailService] SMTP credentials incomplete — emails disabled. ' +
      'Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env to enable.'
    );
    return null;
  }

  _transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT) || 587,
    // true for port 465 (SSL), false for port 587 (STARTTLS)
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Enforce a per-message send timeout to prevent hangs
    connectionTimeout: 10_000, // 10s
    greetingTimeout:    5_000, // 5s
    socketTimeout:     15_000, // 15s
  });

  return _transporter;
}

/* ── Security: HTML escape ───────────────────────────────── */
/**
 * Escapes all HTML special characters in a string value before
 * injecting it into an email template.
 *
 * WHY: User-submitted fields (name, city, message) could contain
 * characters like < > " ' & that would break the HTML structure
 * of the email or, worse, inject malicious content into the admin's
 * inbox if they use a webmail client.
 *
 * @param {*} value - Any value; non-strings are coerced then escaped.
 * @returns {string} HTML-safe string safe for injection into innerHTML / email templates.
 */
function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/* ── Shared email shell template ─────────────────────────── */
/**
 * Wraps bodyHtml in a fully branded, table-based email layout.
 * Uses inline styles for maximum email client compatibility.
 *
 * @param {string} title   - Email subject / <title> tag content (NOT user data)
 * @param {string} bodyHtml - Pre-escaped HTML content to inject into the body cell
 * @returns {string} Complete HTML email string
 */
const emailShell = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#04091E;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04091E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#0A1845;border-radius:12px;border:1px solid rgba(232,98,10,0.35);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#E8620A,#FF8C00);padding:24px 32px;">
              <h1 style="margin:0;font-size:22px;letter-spacing:2px;color:#fff;text-transform:uppercase;">
                Everestia Ventures LLC
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.9);">
                Summit Logistics &middot; Nationwide Freight
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#E8ECF5;font-size:15px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#060D28;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#7A8BB5;">
              &copy; ${new Date().getFullYear()} Everestia Ventures LLC &middot; Licensed &amp; Insured<br>
              <a href="tel:+16824641308" style="color:#E8620A;text-decoration:none;">+1 (682) 464-1308</a>
              &middot;
              <a href="mailto:ventureseverestiallc@gmail.com" style="color:#E8620A;text-decoration:none;">ventureseverestiallc@gmail.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/* ── Email: Customer Confirmation ────────────────────────── */
/**
 * Sends a branded thank-you receipt to the customer who submitted
 * the freight quote form.
 *
 * All quote fields are HTML-escaped before template injection.
 *
 * @param {Object} quote - Saved Mongoose document or equivalent plain object.
 * @returns {Promise<Object>} Nodemailer send result, or { skipped: true }.
 */
async function sendQuoteConfirmationToCustomer(quote) {
  const transport = getTransporter();
  if (!transport) return { skipped: true, reason: 'SMTP not configured' };

  const from    = process.env.MAIL_FROM || process.env.SMTP_USER;
  const subject = 'We received your freight quote request — Everestia Ventures';

  // Escape all user-supplied fields before template injection (XSS prevention)
  const safeName        = escapeHtml(quote.fullName);
  const safeOrigin      = escapeHtml(quote.originCity);
  const safeDestination = escapeHtml(quote.destinationCity);
  const safeService     = escapeHtml(quote.serviceNeeded);
  const safeId          = escapeHtml(String(quote._id));

  const html = emailShell(
    subject,
    `
      <p style="margin:0 0 16px;font-size:18px;color:#fff;">Hi ${safeName},</p>
      <p>Thank you for requesting a quote from
         <strong style="color:#FFB347;">Everestia Ventures LLC</strong>.
      </p>
      <p>Our logistics team is reviewing your shipment details and will respond with a
         tailored, itemized quote <strong>within one hour</strong> during business operations
         (24/7 support available by phone).
      </p>

      <table width="100%" cellpadding="8" cellspacing="0"
             style="margin:20px 0;background:rgba(255,255,255,0.05);border-radius:8px;font-size:14px;">
        <tr>
          <td style="color:#7A8BB5;width:140px;">Route</td>
          <td style="color:#fff;">${safeOrigin} &rarr; ${safeDestination}</td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Service</td>
          <td style="color:#fff;">${safeService}</td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Reference</td>
          <td style="color:#fff;font-family:monospace;font-size:12px;">#${safeId}</td>
        </tr>
      </table>

      <p style="margin:0;">
        Questions? Call us anytime at
        <a href="tel:+16824641308" style="color:#E8620A;">+1 (682) 464-1308</a>.
      </p>
    `
  );

  // Plain-text fallback for clients that don't render HTML
  const text = [
    `Hi ${quote.fullName},`,
    '',
    'Thank you for your freight quote request with Everestia Ventures LLC.',
    'We will respond within one hour.',
    '',
    `Route:    ${quote.originCity} → ${quote.destinationCity}`,
    `Service:  ${quote.serviceNeeded}`,
    `Ref:      #${quote._id}`,
    '',
    'Call us 24/7: +1 (682) 464-1308',
    'Email: ventureseverestiallc@gmail.com',
  ].join('\n');

  return transport.sendMail({ from, to: quote.email, subject, html, text });
}

/* ── Email: Admin Alert ──────────────────────────────────── */
/**
 * Sends a new-submission alert to the Everestia Ventures admin inbox.
 * Includes all actionable quote fields with HTML escaping throughout.
 *
 * @param {Object} quote - Saved Mongoose document.
 * @returns {Promise<Object>} Nodemailer send result, or { skipped: true }.
 */
async function sendQuoteAlertToAdmin(quote) {
  const transport = getTransporter();
  if (!transport) return { skipped: true, reason: 'SMTP not configured' };

  const adminEmail = process.env.ADMIN_EMAIL || 'ventureseverestiallc@gmail.com';
  const from       = process.env.MAIL_FROM || process.env.SMTP_USER;

  // Escape all user fields — admin inbox renders HTML; XSS here is a real risk
  const safeName        = escapeHtml(quote.fullName);
  const safeCompany     = escapeHtml(quote.company);
  const safePhone       = escapeHtml(quote.phone);
  const safeEmail       = escapeHtml(quote.email);
  const safeOrigin      = escapeHtml(quote.originCity);
  const safeDestination = escapeHtml(quote.destinationCity);
  const safeService     = escapeHtml(quote.serviceNeeded);
  const safeStatus      = escapeHtml(quote.status);
  const safeId          = escapeHtml(String(quote._id));
  // For the message body: escape + convert newlines to <br> for readability
  const safeMessage     = escapeHtml(quote.message || '').replace(/\n/g, '<br>');

  // Escape used in subject — some email clients render subject-line HTML
  const subject = `New Quote Request — ${quote.fullName} | ${quote.serviceNeeded}`;

  // Optional rows rendered only when values exist
  const optionalRows = [
    safeCompany
      ? `<tr><td style="color:#7A8BB5;">Company</td><td style="color:#fff;">${safeCompany}</td></tr>`
      : '',
    quote.weight
      ? `<tr><td style="color:#7A8BB5;">Weight</td><td style="color:#fff;">${escapeHtml(String(quote.weight))} lbs</td></tr>`
      : '',
    quote.pickupDate
      ? `<tr><td style="color:#7A8BB5;">Pickup</td><td style="color:#fff;">${new Date(quote.pickupDate).toLocaleDateString('en-US')}</td></tr>`
      : '',
    safeMessage
      ? `<tr><td style="color:#7A8BB5;vertical-align:top;">Message</td><td style="color:#fff;">${safeMessage}</td></tr>`
      : '',
  ].join('');

  const html = emailShell(
    subject,
    `
      <p style="margin:0 0 12px;font-size:16px;color:#FFB347;font-weight:bold;">
        &#x1F69B; New quote submitted via website
      </p>

      <table width="100%" cellpadding="8" cellspacing="0"
             style="background:rgba(255,255,255,0.05);border-radius:8px;font-size:14px;">
        <tr>
          <td style="color:#7A8BB5;width:140px;">Name</td>
          <td style="color:#fff;">${safeName}</td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Phone</td>
          <td style="color:#fff;">
            <a href="tel:${safePhone}" style="color:#E8620A;">${safePhone}</a>
          </td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Email</td>
          <td style="color:#fff;">
            <a href="mailto:${safeEmail}" style="color:#E8620A;">${safeEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Route</td>
          <td style="color:#fff;">${safeOrigin} &rarr; ${safeDestination}</td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Service</td>
          <td style="color:#fff;">${safeService}</td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Status</td>
          <td style="color:#fff;">${safeStatus}</td>
        </tr>
        <tr>
          <td style="color:#7A8BB5;">Mongo ID</td>
          <td style="color:#fff;font-family:monospace;font-size:12px;">${safeId}</td>
        </tr>
        ${optionalRows}
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:#7A8BB5;">
        Update status: PATCH /api/admin/quotes/${safeId}/status
      </p>
    `
  );

  return transport.sendMail({ from, to: adminEmail, subject, html });
}

/* ── SMTP health check ───────────────────────────────────── */
/**
 * Verifies that the SMTP transporter can connect and authenticate.
 * Called at startup in server.js — non-fatal if it fails.
 *
 * @returns {Promise<boolean>} true if SMTP is reachable, false otherwise.
 */
async function verifyConnection() {
  const transport = getTransporter();
  if (!transport) return false;
  try {
    await transport.verify();
    return true;
  } catch (err) {
    console.error('[emailService] SMTP verification failed:', err.message);
    return false;
  }
}

module.exports = {
  getTransporter,
  sendQuoteConfirmationToCustomer,
  sendQuoteAlertToAdmin,
  verifyConnection,
  escapeHtml, // exported for use in other modules and unit tests
};
