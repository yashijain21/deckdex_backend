const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    profile: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' }
    },
    store: {
      storeName: { type: String, trim: true, default: '' },
      storeEmail: { type: String, trim: true, lowercase: true, default: '' },
      storePhone: { type: String, trim: true, default: '' },
      storeAddress: { type: String, trim: true, default: '' }
    },
    pricing: {
      defaultMargin: { type: Number, default: 0 },
      vat: { type: Number, default: 0 }
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 0 },
      deliveryDays: { type: Number, default: 0 },
      shippingCost: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
