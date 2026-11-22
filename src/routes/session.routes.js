// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const telecomService = require('../services/telecom.service');
const sessionStore = require('../store/sessionStore');
const billingService = require('../services/billing.service');
const catalogService = require('../services/catalog.service');
const authenticateToken = require('../middleware/auth.middleware');
const { rentLimiter } = require('../middleware/ratelimit.middleware');
const schedulerService = require('../services/scheduler.service');

// ==========================================
// POST /api/v1/sessions/rent (PROTECTED)
// ==========================================
router.post('/rent', authenticateToken, rentLimiter, async (req, res) => {
  const { country = 'US', service } = req.body;
  const userId = req.user.id;

  if (!service) {
    return res.status(400).json({ error: 'service is required.' });
  }

  let costCents;
  try {
    costCents = await catalogService.getPriceForService(country, service);
  } catch (err) {
    console.error('[CATALOG LOOKUP ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to look up pricing.' });
  }

  if (!costCents) {
    return res.status(404).json({ error: `No available inventory for ${service} in ${country}.` });
  }

  let holdData = null;

  try {
    holdData = await billingService.holdRentalFunds(userId, costCents);

    let sessionData;
    let purchased = null;

    try {
      // SMSPool Flow Only
      purchased = await telecomService.buyNumber(country, service, 'smspool');

      sessionData = {
        id: `sess_${Date.now()}`,
        userId,
        service,
        costCents,
        provider: 'smspool',
        providerOrderId: purchased.orderId,
        subaccountSid: null,
        subaccountToken: null,
        numberSid: null,
        phoneNumber: purchased.phoneNumber,
        status: 'ACTIVE',
        expiresAt: Date.now() + 15 * 60 * 1000,
      };

      await sessionStore.createSession(sessionData);

      try {
        await schedulerService.scheduleSessionExpiry(sessionData.id, sessionData.phoneNumber);
      } catch (schedulerError) {
        console.error('[SCHEDULER FAILED]:', schedulerError.message);
      }

    } catch (provisioningError) {
      console.error('[PROVISIONING FAILED] Executing full compensation:', provisioningError.message);

      if (purchased?.orderId) {
        try {
          await telecomService.cancelOrder(purchased.orderId, 'smspool');
        } catch (cancelErr) {
          console.error('[PROVIDER CANCEL FAILED]', cancelErr.message);
        }
      }

      await billingService.compensateFailedRental(
        userId,
        holdData.holdReference,
        costCents,
        provisioningError.message
      );

      return res.status(502).json({
        error: 'Failed to provision phone number. Your funds have been refunded.',
        details: provisioningError.message,
      });
    }

    return res.status(200).json({
      success: true,
      sessionId: sessionData.id,
      phoneNumber: sessionData.phoneNumber,
      service: sessionData.service,
      costCents: sessionData.costCents,
      expiresAt: sessionData.expiresAt,
    });

  } catch (error) {
    console.error('[RENTAL ROUTE ERROR]:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

// ==========================================
// GET /api/v1/sessions (PROTECTED)
// ==========================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sessions = await sessionStore.getUserSessions(req.user.id);
    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('[GET SESSIONS ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// ==========================================
// GET /api/v1/sessions/:phoneNumber (PROTECTED)
// ==========================================
router.get('/:phoneNumber', authenticateToken, async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    // If it's already expired or completed, just return it
    if (session.status === 'EXPIRED' || session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      return res.status(200).json(session);
    }

    if (session.status === 'ACTIVE' && session.providerOrderId && !session.otp) {
      try {
        const pollResult = await telecomService.pollForOtp(session.providerOrderId, session.provider);

        if (pollResult?.code) {
          await sessionStore.saveOtpAndCompleteSession(session.phoneNumber, {
            sender: pollResult.sender,
            rawText: pollResult.rawText,
            code: pollResult.code,
          });
          session.status = 'COMPLETED';
          session.otp = {
            code: pollResult.code,
            sender: pollResult.sender,
            rawText: pollResult.rawText,
            receivedAt: pollResult.receivedAt,
          };
          return res.status(200).json(session);
        }
      } catch (pollError) {
        console.error('[POLL ERROR]:', pollError.message);
      }
    }

    // Handle Expiry
    if (Date.now() > session.expiresAt && session.status === 'ACTIVE') {
      // 1. Mark as EXPIRED immediately to prevent double refunds
      await sessionStore.updateSessionStatus(session.phoneNumber, 'EXPIRED');
      
      // 2. Try to cancel with SMSPool
      if (session.providerOrderId) {
        try {
          await telecomService.cancelOrder(session.providerOrderId, session.provider);
        } catch (cancelErr) {
          console.error('[SMSPOOL CANCEL ERROR]:', cancelErr.message);
        }
      }

      // 3. Issue Refund (even if SMSPool cancellation failed)
      try {
        await billingService.refundExpiredSession(session.id, req.user.id);
        console.log(`[REFUND SUCCESS] Refunded user ${req.user.id} for session ${session.id}`);
      } catch (refundErr) {
        console.error('[REFUND ERROR]:', refundErr.message);
      }

      session.status = 'EXPIRED';
      return res.status(410).json({ error: 'Session has expired.', refundIssued: true });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error('[GET SESSION ERROR]:', error.message);
    return res.status(500).json({ error: 'Database query failed.' });
  }
});

// ==========================================
// POST /api/v1/sessions/:phoneNumber/release (PROTECTED)
// ==========================================
router.post('/:phoneNumber/release', authenticateToken, async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    if (session.providerOrderId) {
      await telecomService.cancelOrder(session.providerOrderId, session.provider);
    }

    await sessionStore.deleteSession(req.params.phoneNumber);
    return res.status(200).json({ success: true, message: 'Number released.' });
  } catch (error) {
    console.error('[RELEASE ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to release number.', details: error.message });
  }
});

// ==========================================
// POST /api/v1/sessions/:phoneNumber/cancel (PROTECTED)
// ==========================================
router.post('/:phoneNumber/cancel', authenticateToken, async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Cannot cancel a session that is ${session.status}.` });
    }

    // Check if 3 minutes have passed
    const timeElapsed = Date.now() - session.createdAt;
    const threeMinutes = 3 * 60 * 1000;

    if (timeElapsed < threeMinutes) {
      return res.status(400).json({ error: 'You must wait 3 minutes before cancelling.' });
    }

    // 1. Cancel with SMSPool FIRST
    if (session.providerOrderId) {
      try {
        await telecomService.cancelOrder(session.providerOrderId, session.provider);
      } catch (cancelErr) {
        console.error('[SMSPOOL CANCEL FAILED]:', cancelErr.message);
        return res.status(502).json({ error: 'Failed to cancel with the provider. Please try again later.' });
      }
    }

    // 2. Update DB Status to CANCELLED
    await sessionStore.updateSessionStatus(session.phoneNumber, 'CANCELLED');

    // 3. Refund the user
    await billingService.refundExpiredSession(session.id, req.user.id); // Reusing your existing refund logic

    return res.status(200).json({ success: true, message: 'Session cancelled and refunded.' });

  } catch (error) {
    console.error('[CANCEL SESSION ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to cancel session.' });
  }
});

module.exports = router;