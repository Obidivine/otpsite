// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const telecomService = require('../services/telecom.service');
const sessionStore = require('../store/sessionStore');
const billingService = require('../services/billing.service');
const authenticateToken = require('../middleware/auth.middleware');

// POST /api/v1/sessions/rent (PROTECTED)
router.post('/rent', authenticateToken, async (req, res) => {
  const { country = 'US', service } = req.body;
  const userId = req.user.id;

  if (!service) {
    return res.status(400).json({ error: 'service is required.' });
  }

  let holdData = null;

  try {
    // STEP 1: Transaction A — hold funds (~10ms, locks user row)
    holdData = await billingService.holdRentalFunds(userId);

    // STEP 2: External network call (OUTSIDE any DB transaction)
    let subaccount, provisioned;
    try {
      subaccount = await telecomService.createSubaccount(userId);
      provisioned = await telecomService.provisionPhoneNumber(
        subaccount.sid,
        subaccount.authToken,
        country
      );
    } catch (telecomError) {
      // STEP 2B: Twilio failed → compensate (refund the user)
      console.error('[TELECOM PROVISIONING FAILED] Executing refund:', telecomError.message);
      await billingService.compensateFailedRental(
        userId,
        holdData.holdReference,
        telecomError.message
      );
      return res.status(502).json({
        error: 'Failed to provision phone number. Your funds have been refunded.',
        details: telecomError.message
      });
    }

    // STEP 3: Insert session row
    const sessionData = {
      id: `sess_${Date.now()}`,
      userId,
      service,
      subaccountSid: subaccount.sid,
      subaccountToken: subaccount.authToken,
      numberSid: provisioned.numberSid,
      phoneNumber: provisioned.phoneNumber,
      status: 'ACTIVE',
      expiresAt: Date.now() + (15 * 60 * 1000)
    };

    await sessionStore.createSession(sessionData);

    return res.status(200).json({
      success: true,
      sessionId: sessionData.id,
      phoneNumber: sessionData.phoneNumber,
      service: sessionData.service,
      expiresAt: sessionData.expiresAt
    });

  } catch (error) {
    console.error('[RENTAL ROUTE ERROR]:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

// GET /api/v1/sessions/:phoneNumber (PROTECTED)
router.get('/:phoneNumber', authenticateToken, async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    // Passive expiry check + idempotent refund trigger
    if (Date.now() > session.expiresAt && session.status === 'ACTIVE') {
      const refunded = await billingService.refundExpiredSession(session.id, req.user.id);
      session.status = 'EXPIRED';
      return res.status(410).json({
        error: 'Session has expired.',
        refundIssued: refunded
      });
    }

    return res.status(200).json(session);

  } catch (error) {
    console.error('[GET SESSION ERROR]:', error.message);
    return res.status(500).json({ error: 'Database query failed.' });
  }
});

// POST /api/v1/sessions/:phoneNumber/release (PROTECTED)
router.post('/:phoneNumber/release', authenticateToken, async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    await telecomService.releasePhoneNumber(
      session.subaccountSid,
      session.subaccountToken,
      session.numberSid
    );
    await sessionStore.deleteSession(req.params.phoneNumber);

    return res.status(200).json({ success: true, message: 'Number released.' });

  } catch (error) {
    console.error('[RELEASE ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to release number.', details: error.message });
  }
});

module.exports = router;