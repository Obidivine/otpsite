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
app.set('trust proxy', 1);

// ==========================================
// CORS
// ==========================================
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'https://otpsite-frontend.vercel.app',
    ];

    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Allow any localhost origin (dev)
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }

    // Allow any Vercel preview/production deployment
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow any ngrok-free origin (mobile testing, other tunnels)
    if (origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok-free.dev')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('[CORS BLOCKED]:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'verif-hash', 'upstash-signature'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Belt-and-suspenders CORS headers (in case ngrok strips them)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /\.vercel\.app$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,verif-hash,upstash-signature');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ==========================================
// BODY PARSERS
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1', paymentRoutes);

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