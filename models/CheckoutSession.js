const mongoose = require('mongoose');

const checkoutItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const checkoutCustomerSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, default: '' },
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const checkoutSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [checkoutItemSchema],
    totalAmount: { type: Number, required: true },
    customer: { type: checkoutCustomerSchema, default: () => ({}) },
    customerType: { type: String, enum: ['privat', 'foretag'], default: 'privat' },
    stripeSessionId: { type: String, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    status: { type: String, enum: ['initiated', 'paid', 'failed'], default: 'initiated' }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

module.exports = mongoose.model('CheckoutSession', checkoutSessionSchema);

