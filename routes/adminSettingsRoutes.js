const express = require('express');
const {
  getSettings,
  updateProfile,
  updatePassword,
  updateStoreSettings,
  updatePricingSettings,
  updateShippingSettings,
  getMargin,
  updateMargin
} = require('../controllers/adminSettingsController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware, adminOnly);

router.get('/', getSettings);
router.post('/profile', updateProfile);
router.post('/change-password', updatePassword);
router.post('/store', updateStoreSettings);
router.post('/pricing', updatePricingSettings);
router.post('/shipping', updateShippingSettings);
router.get('/margin', getMargin);
router.post('/margin', updateMargin);

module.exports = router;
