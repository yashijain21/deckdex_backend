const bcrypt = require('bcrypt');
const AdminSettings = require('../models/AdminSettings');
const User = require('../models/User');

const SETTINGS_KEY = 'global';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getOrCreateSettings() {
  let settings = await AdminSettings.findOne({ key: SETTINGS_KEY });
  if (!settings) {
    settings = await AdminSettings.create({ key: SETTINGS_KEY });
  }
  return settings;
}

function mapSettings(settings, adminUser) {
  return {
    profile: {
      name: settings.profile?.name || adminUser?.name || '',
      email: settings.profile?.email || adminUser?.email || ''
    },
    store: {
      storeName: settings.store?.storeName || '',
      storeEmail: settings.store?.storeEmail || '',
      storePhone: settings.store?.storePhone || '',
      storeAddress: settings.store?.storeAddress || ''
    },
    pricing: {
      defaultMargin: toNumber(settings.pricing?.defaultMargin, 0),
      vat: toNumber(settings.pricing?.vat, 0)
    },
    shipping: {
      freeShippingThreshold: toNumber(settings.shipping?.freeShippingThreshold, 0),
      deliveryDays: toNumber(settings.shipping?.deliveryDays, 0),
      shippingCost: toNumber(settings.shipping?.shippingCost, 0)
    }
  };
}

const getSettings = async (req, res, next) => {
  try {
    const [settings, adminUser] = await Promise.all([
      getOrCreateSettings(),
      User.findById(req.user.id).select('name email')
    ]);

    res.json({
      success: true,
      data: mapSettings(settings, adminUser)
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    const conflict = await User.findOne({ email, _id: { $ne: req.user.id } }).select('_id');
    if (conflict) {
      return res.status(409).json({ success: false, error: 'Email already in use.' });
    }

    const [settings, user] = await Promise.all([
      getOrCreateSettings(),
      User.findById(req.user.id)
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Admin user not found.' });
    }

    user.name = name;
    user.email = email;
    settings.profile.name = name;
    settings.profile.email = email;

    await Promise.all([user.save(), settings.save()]);

    return res.json({
      success: true,
      data: {
        name: settings.profile.name,
        email: settings.profile.email
      }
    });
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both password fields are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Admin user not found.' });
    }

    const validCurrent = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrent) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      data: { changed: true }
    });
  } catch (err) {
    next(err);
  }
};

const updateStoreSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    settings.store.storeName = String(req.body?.storeName || '').trim();
    settings.store.storeEmail = String(req.body?.storeEmail || '').trim().toLowerCase();
    settings.store.storePhone = String(req.body?.storePhone || '').trim();
    settings.store.storeAddress = String(req.body?.storeAddress || '').trim();

    await settings.save();

    res.json({
      success: true,
      data: settings.store
    });
  } catch (err) {
    next(err);
  }
};

const updatePricingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    settings.pricing.defaultMargin = Math.max(0, toNumber(req.body?.defaultMargin, 0));
    settings.pricing.vat = Math.max(0, toNumber(req.body?.vat, 0));

    await settings.save();

    res.json({
      success: true,
      data: settings.pricing
    });
  } catch (err) {
    next(err);
  }
};

const updateShippingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    settings.shipping.freeShippingThreshold = Math.max(0, toNumber(req.body?.freeShippingThreshold, 0));
    settings.shipping.deliveryDays = Math.max(0, toNumber(req.body?.deliveryDays, 0));
    settings.shipping.shippingCost = Math.max(0, toNumber(req.body?.shippingCost, 0));

    await settings.save();

    res.json({
      success: true,
      data: settings.shipping
    });
  } catch (err) {
    next(err);
  }
};

const getMargin = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      success: true,
      data: {
        defaultMargin: toNumber(settings.pricing?.defaultMargin, 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateMargin = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    settings.pricing.defaultMargin = Math.max(0, toNumber(req.body?.defaultMargin, 0));
    await settings.save();

    res.json({
      success: true,
      data: {
        defaultMargin: settings.pricing.defaultMargin
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateProfile,
  updatePassword,
  updateStoreSettings,
  updatePricingSettings,
  updateShippingSettings,
  getMargin,
  updateMargin
};
