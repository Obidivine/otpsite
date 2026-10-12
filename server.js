// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const sessionRoutes = require('./src/routes/session.routes');
const webhookRoutes = require('./src/routes/webhook.routes');
const catalogRoutes = require('./src/routes/catalog.routes');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();

// ==========================================
// PROXY TRUST
// ==========================================
// Trust ngrok/Cloudflare proxy headers for correct client IP in rate limiting
app.set('trust proxy', 1);

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1', paymentRoutes);  // wallet + payments — paths defined inside

// Healthcheck (public)
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'OK' });
});

// ==========================================
// START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`[Phase 2 - Chunk 5B Active] Server on port ${PORT}`);
  console.log(`==============================================\n`);
});