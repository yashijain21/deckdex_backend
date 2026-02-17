const Cart = require('../models/Cart');

const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const parsedQty = Number(quantity);
    const quantityToAdd = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 4;
    if (!productId) return res.status(400).json({ message: 'productId is required' });

    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [{ productId, quantity: quantityToAdd }] });
      return res.status(201).json(cart);
    }

    const existing = cart.items.find((i) => i.productId.toString() === productId);
    if (existing) {
      existing.quantity += quantityToAdd;
    } else {
      cart.items.push({ productId, quantity: quantityToAdd });
    }
    await cart.save();
    res.json(cart);
  } catch (err) {
    next(err);
  }
};

const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    if (!cart) return res.json({ userId: req.user.id, items: [] });
    res.json(cart);
  } catch (err) {
    next(err);
  }
};

const updateCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || quantity === undefined) {
      return res.status(400).json({ message: 'productId and quantity are required' });
    }
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    if (Number(quantity) <= 0) {
      cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    } else {
      item.quantity = Number(quantity);
    }
    await cart.save();
    res.json(cart);
  } catch (err) {
    next(err);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    next(err);
  }
};

module.exports = { addToCart, getCart, updateCart, removeFromCart };

