const Order = require('../models/Order');
const {
  createCheckoutSession,
  verifyWebhook,
  retrieveCheckoutSession
} = require('../services/stripeService');

const createIntent = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not allowed to pay this order' });
    }

    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      'http://localhost:3000';

    const session = await createCheckoutSession({
      amount: Number(order.totalAmount || 0),
      currency: 'sek',
      orderId: order._id,
      successUrl: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancelUrl: `${frontendUrl}/checkout?canceled=1&order_id=${order._id}`,
      customerEmail: order.customer?.email,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phone
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (err) {
    next(err);
  }
};

const getCheckoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

    const session = await retrieveCheckoutSession(sessionId);
    const orderId = session?.metadata?.orderId;

    let order = null;
    if (orderId) {
      order = await Order.findById(orderId);
    } else {
      order = await Order.findOne({ stripeSessionId: sessionId });
    }

    if (!order) return res.status(404).json({ message: 'Order not found for session' });
    if (order.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not allowed to view this session' });
    }

    res.json({
      orderId: order._id,
      status: order.status,
      paymentStatus: session.payment_status,
      sessionId: session.id
    });
  } catch (err) {
    next(err);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = verifyWebhook(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          status: 'paid',
          paymentIntentId: session.payment_intent || undefined,
          stripeSessionId: session.id
        });
      } else if (session.id) {
        await Order.findOneAndUpdate(
          { stripeSessionId: session.id },
          { status: 'paid', paymentIntentId: session.payment_intent || undefined }
        );
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { status: 'pending' });
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createIntent, getCheckoutSession, webhook };
