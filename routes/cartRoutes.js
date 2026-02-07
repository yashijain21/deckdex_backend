const express = require('express');
const { addToCart, getCart, updateCart, removeFromCart } = require('../controllers/cartController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/add', authMiddleware, addToCart);
router.get('/', authMiddleware, getCart);
router.put('/update', authMiddleware, updateCart);
router.delete('/remove/:productId', authMiddleware, removeFromCart);

module.exports = router;
