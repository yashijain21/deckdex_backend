const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, trim: true },
    season: { type: String, trim: true },
    width: { type: Number, index: true },
    profile: { type: Number, index: true },
    diameter: { type: Number, index: true },
    size_index: { type: String, trim: true },
    ean: { type: String, trim: true },
    availability: { type: String, trim: true },
    fuel_rating: { type: String, trim: true },
    wet_rating: { type: String, trim: true },
    noise_rating: { type: String, trim: true },
    price: { type: Number, index: true },
    stock: { type: Number, default: 10, min: 0, index: true },
    image: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

productSchema.index({ width: 1, profile: 1, diameter: 1, brand: 1, price: 1, season: 1 });

module.exports = mongoose.model('Product', productSchema);
