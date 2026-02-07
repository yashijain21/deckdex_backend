const Product = require('../models/Product');
const { parseCsvFile } = require('../services/csvService');

const uploadProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }
    const products = await parseCsvFile(req.file.path);
    if (!products.length) {
      return res.status(400).json({ message: 'No products found in CSV' });
    }
    const inserted = await Product.insertMany(products, { ordered: false });
    res.status(201).json({ inserted: inserted.length });
  } catch (err) {
    next(err);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const {
      width,
      profile,
      diameter,
      brand,
      season,
      fuel_rating,
      wet_rating,
      noise_rating,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};
    if (width) filter.width = Number(width);
    if (profile) filter.profile = Number(profile);
    if (diameter) filter.diameter = Number(diameter);
    if (brand) filter.brand = brand;
    if (season) filter.season = season;
    if (fuel_rating) filter.fuel_rating = fuel_rating;
    if (wet_rating) filter.wet_rating = wet_rating;
    if (noise_rating) filter.noise_rating = noise_rating;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(limitNum),
      Product.countDocuments(filter)
    ]);

    res.json({
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const getFilters = async (req, res, next) => {
  try {
    const [brand, width, profile, diameter, season, fuel_rating, wet_rating, noise_rating] = await Promise.all([
      Product.distinct('brand'),
      Product.distinct('width'),
      Product.distinct('profile'),
      Product.distinct('diameter'),
      Product.distinct('season'),
      Product.distinct('fuel_rating'),
      Product.distinct('wet_rating'),
      Product.distinct('noise_rating')
    ]);

    res.json({ brand, width, profile, diameter, season, fuel_rating, wet_rating, noise_rating });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadProducts, getProducts, getProductById, getFilters };
