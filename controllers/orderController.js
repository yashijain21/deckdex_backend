const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const createOrder = async (req, res, next) => {
  try {
    const rawCustomer = req.body.customer || {};
    const customer = {
      email: String(rawCustomer.email || '').trim(),
      name: String(rawCustomer.name || '').trim(),
      phone: String(rawCustomer.phone || '').trim(),
      address: String(rawCustomer.address || '').trim(),
      city: String(rawCustomer.city || '').trim(),
      postalCode: String(rawCustomer.postalCode || '').trim()
    };
    const customerType = req.body.customerType === 'foretag' ? 'foretag' : 'privat';

    let items = req.body.items;
    if (!items || !items.length) {
      const cart = await Cart.findOne({ userId: req.user.id });
      if (!cart || !cart.items.length) {
        return res.status(400).json({ message: 'No items to order' });
      }
      items = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const orderItems = items.map((i) => {
      const product = products.find((p) => p._id.toString() === i.productId.toString());
      if (!product) throw new Error('Product not found for order item');
      return {
        productId: product._id,
        quantity: Number(i.quantity),
        price: product.price
      };
    });

    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create({
      userId: req.user.id,
      items: orderItems,
      totalAmount,
      customer,
      customerType
    });

    await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [] });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders };
