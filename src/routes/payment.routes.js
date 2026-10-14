// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth.middleware');

const USD_NGN_RATE = parseFloat(process.env.USD_NGN_RATE || '1500');

// ==========================================
// 1. POST /api/v1/wallet/topup/init
// Creates a payment intent in USD cents
// ==========================================
router.post('/wallet/topup/init', authenticateToken, async (req, res) => {
  const { amountCents } = req.body;
  const userId = req.user.id;

  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: 'Valid amountCents is required.' });
  }

  const txRef = `topup_${userId}_${Date.now()}`;

  // NGN equivalent sent to frontend for Flutterwave checkout only
  const amountNGN = (amountCents / 100) * USD_NGN_RATE;

  try {
    await db.query(
      `INSERT INTO public.payment_intents (user_id, tx_ref, amount_cents, status)
       VALUES ($1, $2, $3, 'PENDING');`,
      [userId, txRef, amountCents]
    );

    return res.status(200).json({
      success: true,
      txRef,
      amountCents,
      amountNGN: Math.round(amountNGN * 100) / 100,
      currency: 'NGN'
    });
  } catch (err) {
    console.error('[TOPUP INIT ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to initialize payment intent.' });
  }
});

// ==========================================
// 1b. POST /api/v1/wallet/topup/checkout
// Calls Flutterwave to generate hosted checkout URL
// ==========================================
router.post('/wallet/topup/checkout', authenticateToken, async (req, res) => {
  const { txRef } = req.body;
  const userId = req.user.id;

  if (!txRef) {
    return res.status(400).json({ error: 'txRef is required.' });
  }

  try {
    // 1. Verify the intent exists and belongs to this user
    const intentRes = await db.query(
      `SELECT tx_ref, user_id, amount_cents, status 
       FROM public.payment_intents 
       WHERE tx_ref = $1 AND user_id = $2;`,
      [txRef, userId]
    );

    if (intentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment intent not found.' });
    }

    const intent = intentRes.rows[0];

    if (intent.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Payment intent already processed.',
        status: intent.status
      });
    }

    // 2. Get user's email
    const userRes = await db.query(
      `SELECT email FROM public.users WHERE id = $1;`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userEmail = userRes.rows[0].email;

    // 3. Convert USD cents → NGN for Flutterwave
    const amountNGN = (parseInt(intent.amount_cents, 10) / 100) * USD_NGN_RATE;

    // 4. Call Flutterwave to create payment
    const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountNGN,
        currency: 'NGN',
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/wallet?status=success`,
        customer: {
          email: userEmail,
        },
        customizations: {
          title: 'OTP Reseller Top-Up',
          description: `Wallet top-up of $${(parseInt(intent.amount_cents, 10) / 100).toFixed(2)}`,
        },
      }),
    });

    const flwData = await flwResponse.json();

    if (flwData.status !== 'success' || !flwData.data?.link) {
      console.error('[FLUTTERWAVE CHECKOUT ERROR]:', flwData);
      return res.status(502).json({
        error: 'Failed to create Flutterwave checkout.',
        details: flwData.message || 'Unknown error',
      });
    }

    // 5. Return the hosted payment link
    return res.status(200).json({
      success: true,
      txRef,
      amountNGN,
      checkoutUrl: flwData.data.link,
    });

  } catch (err) {
    console.error('[CHECKOUT ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to initiate checkout.' });
  }
});

// ==========================================
// 2. GET /api/v1/wallet/balance
// ==========================================
router.get('/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT balance_cents FROM public.users WHERE id = $1;`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const balanceCents = parseInt(rows[0].balance_cents, 10);

    return res.status(200).json({
      success: true,
      balanceCents,
      balanceUSD: (balanceCents / 100).toFixed(2)
    });
  } catch (err) {
    console.error('[WALLET BALANCE ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch balance.' });
  }
});

// ==========================================
// 3. GET /api/v1/wallet/transactions
// ==========================================
router.get('/wallet/transactions', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT amount_cents, type, reference, status, notes, created_at
       FROM public.transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50;`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, transactions: rows });
  } catch (err) {
    console.error('[TRANSACTIONS ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// ==========================================
// 4. POST /api/v1/payments/flutterwave/webhook
// Converts NGN to USD cents, credits balance
// ==========================================
router.post('/payments/flutterwave/webhook', async (req, res) => {
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== process.env.FLW_SECRET_HASH) {
    return res.status(401).json({ error: 'Unauthorized webhook signature.' });
  }

  const event = req.body;

  if (event.event !== 'charge.completed' || event.data.status !== 'successful') {
    return res.status(200).json({ status: 'ignored' });
  }

  const paymentData = event.data;
  const txRef = paymentData.tx_ref;
  const paidAmountNGN = parseFloat(paymentData.amount);
  const currency = paymentData.currency;

  if (currency !== 'NGN') {
    return res.status(400).json({ error: 'Unsupported payment currency.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Verify intent exists and matches expected USD cents
    const intentRes = await client.query(
      `SELECT * FROM public.payment_intents WHERE tx_ref = $1 AND status = 'PENDING' FOR UPDATE;`,
      [txRef]
    );

    if (intentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or already processed payment reference.' });
    }

    const intent = intentRes.rows[0];
    const expectedNGN = (parseInt(intent.amount_cents, 10) / 100) * USD_NGN_RATE;

    if (paidAmountNGN + 0.01 < expectedNGN) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Paid amount is less than initialized intent.' });
    }

    const userId = intent.user_id;
    const amountUSD = paidAmountNGN / USD_NGN_RATE;
    const amountCents = Math.round(amountUSD * 100);

    await client.query(
      `UPDATE public.payment_intents SET status = 'SUCCESS' WHERE tx_ref = $1;`,
      [txRef]
    );

    await client.query(
      `UPDATE public.users SET balance_cents = balance_cents + $1 WHERE id = $2;`,
      [amountCents, userId]
    );

    await client.query(
      `INSERT INTO public.transactions (user_id, amount_cents, type, reference, status, notes)
       VALUES ($1, $2, 'DEPOSIT', $3, 'COMPLETED', $4);`,
      [userId, amountCents, txRef, `Flutterwave Deposit: ${paidAmountNGN} NGN`]
    );

    await client.query('COMMIT');
    console.log(`[DEPOSIT SUCCESS] Credited user ${userId} with ${amountCents} cents.`);

    return res.status(200).json({ status: 'success' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DEPOSIT WEBHOOK ERROR]:', err.message);
    return res.status(500).json({ error: 'Database transaction failed.' });
  } finally {
    client.release();
  }
});

module.exports = router;