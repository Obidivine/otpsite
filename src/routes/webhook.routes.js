// src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const sessionStore = require('../store/sessionStore');
const telecomService = require('../services/telecom.service');
const billingService = require('../services/billing.service');

// POST /api/v1/webhooks/qstash/expire-session
router.post('/qstash/expire-session', async (req, res) => {
  const { sessionId, phoneNumber } = req.body;

  try {
    const session = await sessionStore.getSessionByPhone(phoneNumber);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // If it's already completed or expired, do nothing
    if (session.status !== 'ACTIVE') {
      return res.status(200).json({ status: 'ignored', reason: 'Session not active.' });
    }

    // 1. Mark EXPIRED
    await sessionStore.updateSessionStatus(phoneNumber, 'EXPIRED');

    // 2. Cancel with SMSPool
    if (session.providerOrderId) {
      try {
        await telecomService.cancelOrder(session.providerOrderId, session.provider);
      } catch (err) {
        console.error('[QSTASH CANCEL ERROR]:', err.message);
      }
    }

    // 3. Refund User
    await billingService.refundExpiredSession(session.id, session.userId);

    console.log(`[QSTASH SUCCESS] Expired and refunded session ${sessionId}`);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[QSTASH WEBHOOK ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to process expiry.' });
  }
});

module.exports = router;