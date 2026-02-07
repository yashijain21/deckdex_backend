const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency = 'usd') => {
  return stripe.paymentIntents.create({
    amount,
    currency
  });
};

const verifyWebhook = (payload, signature, webhookSecret) => {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};

module.exports = { createPaymentIntent, verifyWebhook };
