#!/usr/bin/env node
/**
 * Create or update a user in the PostgreSQL database.
 *
 * Usage:
 *   node scripts/create-user.js --email admin@example.com --password Secret123 --role admin
 *
 * Flags:
 *   --email     required
 *   --password  required (plain text — will be bcrypt-hashed)
 *   --role      optional, default 'admin'  (customer|manager|admin|staff)
 *   --name      optional, default 'Admin'
 *
 * Idempotent: if the email already exists the password and role are updated.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('../models/User');   // register model
require('../models/Order');  // associations

const sequelize = require('../src/config/db');
const User = require('../models/User');

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const email    = get('--email');
const password = get('--password');
const role     = get('--role')  || 'admin';
const name     = get('--name')  || 'Admin';

if (!email || !password) {
  console.error('Usage: node scripts/create-user.js --email <e> --password <p> [--role admin] [--name "Name"]');
  process.exit(1);
}

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    const [user, created] = await User.findOrCreate({
      where: { email: email.toLowerCase().trim() },
      defaults: { name, password, role },
    });

    if (!created) {
      await user.update({ password, role, name });
      console.log(`Updated user: ${email} (role: ${role})`);
    } else {
      console.log(`Created user: ${email} (role: ${role})`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

