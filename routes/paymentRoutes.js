const express = require('express');
const { createIntent, getCheckoutSession, webhook } = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create-intent', authMiddleware, createIntent);
router.get('/session/:sessionId', authMiddleware, getCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

module.exports = router;

