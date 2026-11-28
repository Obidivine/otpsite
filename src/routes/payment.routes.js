// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth.middleware');
const crypto = require('crypto');
const { sendAdminAlert } = require('../services/telegram.service');

// ==========================================
// FLUTTERWAVE ROUTES (NAIRA/KOBO ONLY)
// ==========================================
router.post('/wallet/topup/init', authenticateToken, async (req, res) => {
  const { amountCents } = req.body; // amountCents is now KOBO
  const userId = req.user.id;

  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: 'Valid amountCents (in Kobo) is required.' });
  }

  const txRef = `topup_${userId}_${Date.now()}`;

  try {
    await db.query(
      `INSERT INTO public.payment_intents (user_id, tx_ref, amount_cents, status)
       VALUES ($1, $2, $3, 'PENDING');`,
      [userId, txRef, amountCents]
    );
    
    // ---> ADD THIS DELAYED EMAIL CHECK <---
      // Wait 15 minutes, then check if the payment intent is still PENDING. 
      // If it is, send them a reminder email.
      setTimeout(async () => {
        try {
          const checkRes = await db.query(
            'SELECT status FROM public.payment_intents WHERE tx_ref = $1',
            [txRef]
          );
          
          // If still pending, they abandoned the checkout
          if (checkRes.rows[0]?.status === 'PENDING') {
            const userRes = await db.query('SELECT email FROM public.users WHERE id = $1', [userId]);
            const email = userRes.rows[0]?.email;
            
            if (email) {
              await transporter.sendMail({
                from: '"OTP360 Support" <otpreseller360@gmail.com>',
                to: email,
                subject: 'Did you have trouble topping up? 🤔',
                html: `
                  <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
                      <h2 style="color: #ffffff; margin-bottom: 20px;">Payment Incomplete</h2>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
                        Hi there,
                      </p>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
                        We noticed you tried to top up your OTP360 wallet recently, but the payment didn't go through.
                      </p>
                      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
                        If you had any issues with the checkout page, please try again. If the problem persists, our support team is here to help.
                      </p>
                      <a href="https://otp360.store/dashboard/wallet" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px;">
                        Try Again
                      </a>
                      <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
                        Need help? <a href="https://wa.me/2347040763069" style="color: #3b82f6;">Chat with us on WhatsApp</a>.
                      </p>
                    </div>
                  </div>
                `,
              });
            }
          }
        } catch (err) {
          console.error('[ABANDONED CART EMAIL ERROR]:', err.message);
        }
      }, 15 * 60 * 1000); // 15 minutes

    return res.status(200).json({
      success: true,
      txRef,
      amountCents,
      currency: 'NGN'
    });
  } catch (err) {
    console.error('[TOPUP INIT ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to initialize payment intent.' });
  }
});

router.post('/wallet/topup/checkout', authenticateToken, async (req, res) => {
  const { txRef } = req.body;
  const userId = req.user.id;

  if (!txRef) {
    return res.status(400).json({ error: 'txRef is required.' });
  }

  try {
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

    const userRes = await db.query(
      `SELECT email FROM public.users WHERE id = $1;`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userEmail = userRes.rows[0].email;
    // Convert Kobo to Naira for Flutterwave
    const amountNGN = parseInt(intent.amount_cents, 10) / 100; 

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
        customer: { email: userEmail },
        customizations: {
          title: 'OTP Reseller Top-Up',
          description: `Wallet top-up of ₦${amountNGN.toLocaleString('en-NG')}`,
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

    const intentRes = await client.query(
      `SELECT * FROM public.payment_intents WHERE tx_ref = $1 AND status = 'PENDING' FOR UPDATE;`,
      [txRef]
    );

    if (intentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or already processed payment reference.' });
    }

    const intent = intentRes.rows[0];
    // Expected amount in Naira (Kobo / 100)
    const expectedNGN = parseInt(intent.amount_cents, 10) / 100;

    if (paidAmountNGN + 0.01 < expectedNGN) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Paid amount is less than initialized intent.' });
    }

    const userId = intent.user_id;
    // Convert paid Naira to Kobo
    const amountKobo = Math.round(paidAmountNGN * 100); 

    await client.query(
      `UPDATE public.payment_intents SET status = 'SUCCESS' WHERE tx_ref = $1;`,
      [txRef]
    );

    await client.query(
      `UPDATE public.users SET balance_cents = balance_cents + $1 WHERE id = $2;`,
      [amountKobo, userId]
    );

    await client.query(
      `INSERT INTO public.transactions (user_id, amount_cents, type, reference, status, notes)
       VALUES ($1, $2, 'DEPOSIT', $3, 'COMPLETED', $4);`,
      [userId, amountKobo, txRef, `Flutterwave Deposit: ₦${paidAmountNGN.toLocaleString('en-NG')}`]
    );

    await client.query('COMMIT');
    console.log(`[DEPOSIT SUCCESS] Credited user ${userId} with ${amountKobo} Kobo.`);
    
    sendAdminAlert(`🚨 <b>NEW DEPOSIT!</b>\n\nUser: ${userId}\nAmount: ₦${(intent.amount_cents / 100).toLocaleString()}\nProvider: Paystack`);

    return res.status(200).json({ status: 'success' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DEPOSIT WEBHOOK ERROR]:', err.message);
    return res.status(500).json({ error: 'Database transaction failed.' });
  } finally {
    client.release();
  }
});

// ==========================================
// PAYSTACK ROUTES (NAIRA/KOBO ONLY)
// ==========================================
router.post('/wallet/paystack/init', authenticateToken, async (req, res) => {
  const { amountCents } = req.body; // amountCents is now KOBO
  const userId = req.user.id;

  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: 'Valid amountCents (in Kobo) is required.' });
  }

  // Paystack expects Kobo, which is exactly what amountCents is now.
  const amountKobo = amountCents; 
  const txRef = `paystack_${userId}_${Date.now()}`;

  try {
    const userRes = await db.query('SELECT email FROM public.users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userEmail = userRes.rows[0].email;

    await db.query(
      `INSERT INTO public.payment_intents (user_id, tx_ref, amount_cents, status)
       VALUES ($1, $2, $3, 'PENDING')`,
      [userId, txRef, amountCents]
    );

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        amount: amountKobo, 
        reference: txRef,
        callback_url: `${process.env.FRONTEND_URL}/dashboard/wallet?status=success`,
      }),
    });

    const paystackData = await response.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Paystack init failed');
    }

    return res.status(200).json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: txRef,
    });

  } catch (err) {
    console.error('[PAYSTACK INIT ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to initialize Paystack.' });
  }
});

router.post('/payments/paystack/webhook', async (req, res) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const { reference } = event.data;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const intentRes = await client.query(
        `SELECT * FROM public.payment_intents WHERE tx_ref = $1 AND status = 'PENDING' FOR UPDATE`,
        [reference]
      );

      if (intentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(200).send('Already processed or invalid');
      }

      const intent = intentRes.rows[0];
      const userId = intent.user_id;

      await client.query(
        `UPDATE public.payment_intents SET status = 'SUCCESS' WHERE tx_ref = $1`,
        [reference]
      );

      await client.query(
        `UPDATE public.users SET balance_cents = balance_cents + $1 WHERE id = $2`,
        [intent.amount_cents, userId]
      );

      await client.query(
        `INSERT INTO public.transactions (user_id, amount_cents, type, reference, status, notes)
         VALUES ($1, $2, 'DEPOSIT', $3, 'COMPLETED', 'Paystack Deposit')`,
        [userId, intent.amount_cents, reference]
      );

      await client.query('COMMIT');
      console.log(`[PAYSTACK SUCCESS] Credited user ${userId} with ${intent.amount_cents} Kobo.`);
      return res.status(200).send('OK');

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PAYSTACK WEBHOOK ERROR]:', err.message);
      return res.status(500).send('Database error');
    } finally {
      client.release();
    }
  }

  return res.status(200).send('Event ignored');
});

// ==========================================
// WALLET ROUTES
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
    });
  } catch (err) {
    console.error('[BALANCE DB ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch balance.' });
  }
});

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

module.exports = router;