const Order = require('../models/Order');
const { createPaymentIntent, verifyWebhook } = require('../services/stripeService');

const createIntent = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const intent = await createPaymentIntent(Math.round(order.totalAmount * 100), 'usd');
    order.paymentIntentId = intent.id;
    await order.save();

    res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err) {
    next(err);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = verifyWebhook(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      await Order.findOneAndUpdate({ paymentIntentId: intent.id }, { status: 'paid' });
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createIntent, webhook };
