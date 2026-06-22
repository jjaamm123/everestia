require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/everestia_ventures';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected.');

    const email = 'admin@everestia.com';
    const password = 'EverestiaAdmin123!';

    const db = mongoose.connection.db;
    const adminsCollection = db.collection('admins');

    const existingAdmin = await adminsCollection.findOne({ email });
    if (existingAdmin) {
      console.log(`[Seed] Admin user ${email} already exists.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await adminsCollection.insertOne({
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[Seed] Admin user created successfully:`);
    console.log(`  - Email: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Failure:', err.message);
    process.exit(1);
  }
}

seedAdmin();
