const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const resolvePaymentMethodTypes = () => {
  const raw = process.env.STRIPE_PAYMENT_METHOD_TYPES || 'card,klarna';
  const normalized = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.toLowerCase())
    .map((v) => (v === 'apple_pay' || v === 'google_pay' ? 'card' : v));

  const allowed = new Set([
    'card',
    'klarna',
    'link',
    'sepa_debit',
    'bancontact',
    'ideal',
    'eps',
    'giropay',
    'p24',
    'sofort'
  ]);

  const deduped = [...new Set(normalized)].filter((v) => allowed.has(v));
  return deduped.length ? deduped : ['card', 'klarna'];
};

const createCheckoutSession = async ({
  amount,
  currency = 'sek',
  orderId,
  successUrl,
  cancelUrl,
  customerEmail,
  customerName,
  customerPhone
}) => {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: resolvePaymentMethodTypes(),
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    locale: 'sv',
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Order #${String(orderId).slice(-6)}`,
            description: customerName
              ? `Kund: ${customerName}${customerPhone ? ` | ${customerPhone}` : ''}`
              : 'DackDax-bestallning'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }
    ],
    metadata: {
      orderId: String(orderId)
    },
    payment_intent_data: {
      metadata: {
        orderId: String(orderId)
      }
    },
    success_url: successUrl,
    cancel_url: cancelUrl
  });
};

const verifyWebhook = (payload, signature, webhookSecret) => {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};

const retrieveCheckoutSession = async (sessionId) => {
  return stripe.checkout.sessions.retrieve(sessionId);
};

module.exports = { createCheckoutSession, verifyWebhook, retrieveCheckoutSession };
