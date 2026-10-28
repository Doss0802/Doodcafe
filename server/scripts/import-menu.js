#!/usr/bin/env node
/**
 * Import menu categories and items into the PostgreSQL database.
 * Idempotent — upserts by name; safe to run multiple times.
 *
 * Usage:
 *   node scripts/import-menu.js
 *   DATABASE_URL=postgres://... node scripts/import-menu.js
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('../models/Category');
require('../models/MenuItem');
require('../models/User');
require('../models/Order');

const sequelize = require('../src/config/db');
const Category  = require('../models/Category');
const MenuItem  = require('../models/MenuItem');
const menuData  = require('../seed/menu.json');

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    // Upsert categories
    const catMap = {};
    for (const cat of menuData.categories) {
      const [record] = await Category.findOrCreate({
        where: { name: cat.name },
        defaults: cat,
      });
      catMap[cat.name] = record.id;
    }
    console.log(`Categories: ${Object.keys(catMap).length} upserted.`);

    // Upsert menu items
    let count = 0;
    for (const item of menuData.items) {
      const catId = catMap[item.categoryName];
      if (!catId) { console.warn(`Unknown category: ${item.categoryName}`); continue; }
      const defaults = {
        price:      item.price,
        isVeg:      item.isVeg,
        available:  item.available !== false,
        image:      item.image,
        imageUrl:   item.image,
        categoryId: catId,
      };
      const [, created] = await MenuItem.findOrCreate({
        where: { name: item.name },
        defaults,
      });
      if (!created) {
        await MenuItem.update(defaults, { where: { name: item.name } });
      }
      count++;
    }
    console.log(`Menu items: ${count} upserted.`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

