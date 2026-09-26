// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const sessionRoutes = require('./src/routes/session.routes');
const webhookRoutes = require('./src/routes/webhook.routes');

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'OK' });
});

// ==========================================
// START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`[Phase 2 Server Active] Running on port ${PORT}`);
  console.log(`==============================================\n`);
});