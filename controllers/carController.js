const axios = require('axios');

const getCarByRegistration = async (req, res, next) => {
  try {
    const registration = req.params.registration;
    const apiUrl = process.env.CAR_API_URL || 'https://example.com/car-api';
    let data;
    try {
      const response = await axios.get(`${apiUrl}/${registration}`);
      data = response.data;
    } catch (err) {
      data = {
        make: 'Volvo',
        model: 'XC60',
        year: 2020,
        width: 235,
        profile: 55,
        diameter: 19
      };
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCarByRegistration };
