const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

const SINGLETON_KEY = 'global';

const SiteSettings = sequelize.define('SiteSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    defaultValue: SINGLETON_KEY,
    unique: true,
  },
  show_prices_to_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    },
  },
}, {
  timestamps: true,
  tableName: 'site_settings',
});

SiteSettings.getSettings = async function () {
  let [doc] = await SiteSettings.findOrCreate({
    where: { key: SINGLETON_KEY },
    defaults: { key: SINGLETON_KEY, show_prices_to_public: true },
  });
  return doc;
};

module.exports = SiteSettings;
