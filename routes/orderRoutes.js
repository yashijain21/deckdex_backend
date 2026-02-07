const express = require('express');
const { createOrder, getMyOrders, getAllOrders } = require('../controllers/orderController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createOrder);
router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/', authMiddleware, adminOnly, getAllOrders);

module.exports = router;
