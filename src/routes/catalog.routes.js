// src/routes/catalog.routes.js
const express = require('express');
const router = express.Router();
const catalogService = require('../services/catalog.service');

// GET /api/v1/catalog?service=whatsapp
router.get('/', async (req, res) => {
  const { service } = req.query;

  if (!service) {
    return res.status(400).json({ error: 'Query parameter "service" is required.' });
  }

  try {
    const items = await catalogService.getCatalogByService(service);
    return res.status(200).json({
      service: service.toLowerCase(),
      currency: 'USD_CENTS',
      catalog: items
    });
  } catch (error) {
    console.error('[CATALOG ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to fetch catalog.' });
  }
});

module.exports = router;