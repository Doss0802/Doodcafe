const sequelize = require('../src/config/db');
const User = require('./User');
const Category = require('./Category');
const MenuItem = require('./MenuItem');
const Order = require('./Order');
const SiteSettings = require('./SiteSettings');
const Finance = require('./Finance');
const Inventory = require('./Inventory');

module.exports = {
  sequelize,
  User,
  Category,
  MenuItem,
  Order,
  SiteSettings,
  Finance,
  Inventory,
};
