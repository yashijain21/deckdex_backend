const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadProducts, getProducts, getProductById, getFilters } = require('../controllers/productController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.csv') return cb(new Error('Only CSV files are allowed'));
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

const csvValidation = (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
  next();
};

router.post('/upload', authMiddleware, adminOnly, upload.single('file'), csvValidation, uploadProducts);
router.get('/', getProducts);
router.get('/filters', getFilters);
router.get('/:id', getProductById);

module.exports = router;
