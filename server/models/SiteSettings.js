const mongoose = require('mongoose');

/**
 * SiteSettings — singleton document model.
 * There is always exactly ONE document in this collection, keyed by SINGLETON_KEY.
 * All global configuration flags that need to be persisted and read by the frontend live here.
 */
const SINGLETON_KEY = 'global';

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: SINGLETON_KEY,
      unique: true,
      immutable: true,
    },
    // ── Price Display Control ───────────────────────────────────
    // When false, customer-facing MenuCard components hide all price tags.
    show_prices_to_public: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

/**
 * getSettings() — always returns the singleton document, creating it if absent.
 */
SiteSettings.getSettings = async function () {
  let doc = await SiteSettings.findOne({ key: SINGLETON_KEY });
  if (!doc) {
    doc = await SiteSettings.create({ key: SINGLETON_KEY });
  }
  return doc;
};

module.exports = SiteSettings;
