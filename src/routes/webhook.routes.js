// src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const sessionStore = require('../store/sessionStore');
const billingService = require('../services/billing.service');
const telecomService = require('../services/telecom.service');
const { Receiver } = require('@upstash/qstash');

// QStash signature verification receiver
const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

// ==========================================
// INBOUND SMS WEBHOOK (Twilio) — UNCHANGED
// ==========================================
router.post('/sms/inbound', async (req, res) => {
  const { To, From, Body } = req.body;

  console.log(`\n[INBOUND SMS] To: ${To} (len=${To.length}, codes=${[...To].map(c => c.charCodeAt(0)).join(',')}) | From: ${From} | Body: "${Body}"\n`);

  try {
    const session = await sessionStore.getSessionByPhone(To);

    if (!session || session.status !== 'ACTIVE') {
      res.type('text/xml');
      return res.status(200).send('<Response></Response>');
    }

    const codeMatch = Body ? Body.match(/\b\d{4,8}\b/) : null;
    const parsedCode = codeMatch ? codeMatch[0] : null;

    await sessionStore.saveOtpAndCompleteSession(To, {
      sender: From,
      rawText: Body,
      code: parsedCode
    });

    res.type('text/xml');
    return res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('[WEBHOOK PROCESSING ERROR]:', error.message);
    res.type('text/xml');
    return res.status(200).send('<Response></Response>');
  }
});

// ==========================================
// QSTASH EXPIRY WORKER — NEW
// ==========================================
router.post('/qstash/expire-session', async (req, res) => {
  const signature = req.headers['upstash-signature'];

  if (!signature) {
    return res.status(401).json({ error: 'Missing QStash signature.' });
  }

  try {
    const isValid = await qstashReceiver.verify({
      signature,
      body: JSON.stringify(req.body),
    });
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid QStash signature.' });
    }
  } catch (err) {
    console.error('[QSTASH VERIFICATION ERROR]:', err.message);
    return res.status(401).json({ error: 'Signature verification failed.' });
  }

  const { sessionId, phoneNumber } = req.body;

  try {
    const session = await sessionStore.getSessionByPhone(phoneNumber);
    if (!session || session.status !== 'ACTIVE') {
      return res.status(200).json({ status: 'Session already completed or expired.' });
    }

    // 1. Attempt idempotent refund
    const refunded = await billingService.refundExpiredSession(sessionId, session.userId);

    // 2. ONLY release phone number upstream if the refund actually fired
    if (refunded) {
      await telecomService.releasePhoneNumber(
        session.subaccountSid,
        session.subaccountToken,
        session.numberSid
      );
      console.log(`[QSTASH WORKER] Auto-expired, refunded, and released session ${sessionId}`);
    }

    return res.status(200).json({ success: true, refunded });
  } catch (err) {
    console.error('[QSTASH WORKER ERROR]:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;