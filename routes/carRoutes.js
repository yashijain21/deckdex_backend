const express = require('express');
const { getCarByRegistration } = require('../controllers/carController');

const router = express.Router();

router.get('/:registration', getCarByRegistration);

module.exports = router;
