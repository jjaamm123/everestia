require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

async function runDiagnostic() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database name:', mongoose.connection.name);

    const db = mongoose.connection.db;
    const adminsCollection = db.collection('admins');

    const email = 'admin@everestia.com';
    const admin = await adminsCollection.findOne({ email });

    if (!admin) {
      console.log('Failure warning: User was not found in the database.');
      process.exit(0);
    }

    console.log('Hashed password stored in database:', admin.password);

    const plainTextPassword = 'EverestiaAdmin123!';
    const isMatch = await bcrypt.compare(plainTextPassword, admin.password);

    console.log('Bcrypt comparison result:', isMatch ? 'TRUE' : 'FALSE');
    process.exit(0);
  } catch (error) {
    console.error('Diagnostic error:', error.message);
    process.exit(1);
  }
}

runDiagnostic();
