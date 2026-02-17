const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const CheckoutSession = require('../models/CheckoutSession');
const {
  createCheckoutSession,
  verifyWebhook,
  retrieveCheckoutSession
} = require('../services/stripeService');

const normalizeCustomer = (raw = {}) => ({
  email: String(raw.email || '').trim(),
  name: String(raw.name || '').trim(),
  phone: String(raw.phone || '').trim(),
  address: String(raw.address || '').trim(),
  city: String(raw.city || '').trim(),
  postalCode: String(raw.postalCode || '').trim()
});

const getOrderItemsWithTotal = async (items, customerType) => {
  const normalizedItems = (items || [])
    .map((i) => ({
      productId: String(i?.productId || '').trim(),
      quantity: Number(i?.quantity || 0)
    }))
    .filter((i) => i.productId && i.quantity > 0);

  if (!normalizedItems.length) {
    throw new Error('No valid items to pay');
  }

  const productIds = normalizedItems.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  const orderItems = normalizedItems.map((i) => {
    const product = products.find((p) => p._id.toString() === i.productId.toString());
    if (!product) throw new Error('Product not found for checkout item');
    return {
      productId: product._id,
      quantity: i.quantity,
      price: Number(product.price || 0)
    };
  });

  const baseTotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalAmount =
    customerType === 'privat'
      ? Math.round(baseTotal * 1.25)
      : Math.round(baseTotal);

  return { orderItems, totalAmount };
};

const finalizeCheckoutDataOrder = async (checkoutData, session) => {
  if (!checkoutData) return null;

  if (checkoutData.orderId) {
    const existing = await Order.findById(checkoutData.orderId);
    if (existing) return existing;
  }

  const existingBySession = await Order.findOne({ stripeSessionId: session.id });
  if (existingBySession) {
    await CheckoutSession.findByIdAndUpdate(checkoutData._id, {
      orderId: existingBySession._id,
      status: 'paid'
    });
    return existingBySession;
  }

  const order = await Order.create({
    userId: checkoutData.userId,
    items: checkoutData.items,
    totalAmount: checkoutData.totalAmount,
    customer: checkoutData.customer,
    customerType: checkoutData.customerType,
    status: 'paid',
    paymentIntentId: session.payment_intent || undefined,
    stripeSessionId: session.id
  });

  await CheckoutSession.findByIdAndUpdate(checkoutData._id, {
    orderId: order._id,
    status: 'paid'
  });

  await Cart.findOneAndUpdate({ userId: checkoutData.userId }, { items: [] });

  return order;
};

const createIntent = async (req, res, next) => {
  try {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      'http://localhost:3000';

    const { orderId } = req.body;

    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (order.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Not allowed to pay this order' });
      }

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

      return res.json({ url: session.url, sessionId: session.id });
    }

    const customerType = req.body.customerType === 'foretag' ? 'foretag' : 'privat';
    const customer = normalizeCustomer(req.body.customer || {});
    const { orderItems, totalAmount } = await getOrderItemsWithTotal(req.body.items, customerType);

    const checkoutData = await CheckoutSession.create({
      userId: req.user.id,
      items: orderItems,
      totalAmount,
      customer,
      customerType,
      status: 'initiated'
    });

    const session = await createCheckoutSession({
      amount: Number(totalAmount || 0),
      currency: 'sek',
      checkoutDataId: checkoutData._id,
      successUrl: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/checkout?canceled=1`,
      customerEmail: customer.email,
      customerName: customer.name,
      customerPhone: customer.phone
    });

    checkoutData.stripeSessionId = session.id;
    await checkoutData.save();

    res.json({ url: session.url, sessionId: session.id });
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
    const checkoutDataId = session?.metadata?.checkoutDataId;

    if (checkoutDataId) {
      const checkoutData = await CheckoutSession.findById(checkoutDataId);
      if (!checkoutData) return res.status(404).json({ message: 'Checkout session not found' });
      if (checkoutData.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Not allowed to view this session' });
      }

      if (
        (session.payment_status === 'paid' || checkoutData.status === 'paid') &&
        !checkoutData.orderId
      ) {
        await finalizeCheckoutDataOrder(checkoutData, session);
      }

      const refreshed = await CheckoutSession.findById(checkoutData._id);
      const order = refreshed?.orderId ? await Order.findById(refreshed.orderId) : null;

      return res.json({
        orderId: order?._id || null,
        status: order?.status || refreshed?.status || 'initiated',
        paymentStatus: session.payment_status,
        sessionId: session.id
      });
    }

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

    if (session.payment_status === 'paid' && order.status !== 'paid') {
      order.status = 'paid';
      order.paymentIntentId = session.payment_intent || order.paymentIntentId;
      order.stripeSessionId = session.id;
      await order.save();
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
      const checkoutDataId = session?.metadata?.checkoutDataId;

      if (checkoutDataId) {
        const checkoutData = await CheckoutSession.findById(checkoutDataId);
        if (checkoutData) {
          await finalizeCheckoutDataOrder(checkoutData, session);
        }
      } else if (orderId) {
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
      const checkoutDataId = session?.metadata?.checkoutDataId;

      if (checkoutDataId) {
        await CheckoutSession.findByIdAndUpdate(checkoutDataId, { status: 'failed' });
      } else if (orderId) {
        await Order.findByIdAndUpdate(orderId, { status: 'pending' });
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createIntent, getCheckoutSession, webhook };
