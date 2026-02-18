const fs = require('fs');
const csv = require('csv-parser');
const parseDimension = require('../utils/parseDimension');

const parseCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const { width, profile, diameter } = parseDimension(row.dimension);
        const parsedStock = Number(row.stock);
        results.push({
          url: row.url || '',
          title: row.title || '',
          brand: row.brand || '',
          model: row.model || '',
          season: row.season || '',
          width,
          profile,
          diameter,
          size_index: row.size_index || '',
          ean: row.ean || '',
          availability: row.availability || '',
          fuel_rating: row.fuel_rating || '',
          wet_rating: row.wet_rating || '',
          noise_rating: row.noise_rating || '',
          price: row.price ? Number(row.price) : 0,
          stock: Number.isFinite(parsedStock) ? Math.max(0, Math.floor(parsedStock)) : 10,
          image: row.image || ''
        });
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

module.exports = { parseCsvFile };
