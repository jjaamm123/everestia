/**
 * scripts/seedShipments.js
 * ─────────────────────────────────────────────────────────────
 * Seeds sample shipments for testing GET /api/track/:trackingId
 *
 * Usage: node scripts/seedShipments.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/everestia_ventures';

const samples = [
  {
    trackingId: 'EV-DEMO0001',
    currentLocation: 'Dallas, TX — Distribution Hub',
    status: 'In Transit',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    originCity: 'Los Angeles, CA',
    destinationCity: 'Chicago, IL',
  },
  {
    trackingId: 'EV-DEMO0002',
    currentLocation: 'Delivered — Brooklyn, NY',
    status: 'Delivered',
    estimatedDelivery: new Date(),
    originCity: 'Miami, FL',
    destinationCity: 'Brooklyn, NY',
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const doc of samples) {
    await Shipment.findOneAndUpdate({ trackingId: doc.trackingId }, doc, {
      upsert: true,
      new: true,
    });
    console.log('Upserted:', doc.trackingId);
  }

  await mongoose.disconnect();
  console.log('Done. Try: GET /api/track/EV-DEMO0001');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
