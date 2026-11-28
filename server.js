// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const sessionRoutes = require('./src/routes/session.routes');
const catalogRoutes = require('./src/routes/catalog.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const webhookRoutes = require('./src/routes/webhook.routes');

const app = express();
app.set('trust proxy', 1); // Trust Railway's proxy for rate limiting

// ==========================================
// CORS (Simplified & Fixed)
// ==========================================
app.use(cors({
  origin: true, // Allows any origin (localhost, Vercel, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'verif-hash', 'upstash-signature', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// ==========================================
// BODY PARSERS
// ==========================================
// The verify function is required for Paystack webhooks
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
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