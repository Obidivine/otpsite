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
    return res.status(404).json({
      error: `No available inventory for ${service} in ${country}.`,
    });
  }

  const provider = telecomService.DEFAULT_PROVIDER;
  let holdData = null;

  try {
    holdData = await billingService.holdRentalFunds(userId, costCents);

    let sessionData;
    let purchased = null;

    try {
      if (provider === 'twilio') {
        const subaccount = await telecomService.createSubaccount(userId);
        const provisioned = await telecomService.provisionPhoneNumber(
          subaccount.sid,
          subaccount.authToken,
          country
        );

        sessionData = {
          id: `sess_${Date.now()}`,
          userId,
          service,
          costCents,
          provider: 'twilio',
          providerOrderId: null,
          subaccountSid: subaccount.sid,
          subaccountToken: subaccount.authToken,
          numberSid: provisioned.numberSid,
          phoneNumber: provisioned.phoneNumber,
          status: 'ACTIVE',
          expiresAt: Date.now() + 15 * 60 * 1000,
        };
      } else {
        purchased = await telecomService.buyNumber(country, service, provider);

        sessionData = {
          id: `sess_${Date.now()}`,
          userId,
          service,
          costCents,
          provider,
          providerOrderId: purchased.orderId,
          subaccountSid: null,
          subaccountToken: null,
          numberSid: null,
          phoneNumber: purchased.phoneNumber,
          status: 'ACTIVE',
          expiresAt: Date.now() + 15 * 60 * 1000,
        };
      }

      await sessionStore.createSession(sessionData);

      try {
        await schedulerService.scheduleSessionExpiry(sessionData.id, sessionData.phoneNumber);
      } catch (schedulerError) {
        console.error('[SCHEDULER FAILED] Passive polling will handle expiry:', schedulerError.message);
      }

    } catch (provisioningError) {
      console.error('[PROVISIONING FAILED] Executing full compensation:', provisioningError.message);

      if (purchased?.orderId) {
        try {
          await telecomService.cancelOrder(purchased.orderId, provider);
          console.log('[PROVIDER CANCEL] Cancelled order', purchased.orderId);
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

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    if (session.status === 'EXPIRED' || session.status === 'COMPLETED') {
      return res.status(200).json(session);
    }

    if (
      session.status === 'ACTIVE' &&
      session.provider !== 'twilio' &&
      session.providerOrderId &&
      !session.otp
    ) {
      try {
        const pollResult = await telecomService.pollForOtp(
          session.providerOrderId,
          session.provider
        );

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

        if (pollResult?.expired) {
          console.log('[PROVIDER EXPIRED] Cancelling order', session.providerOrderId);
          await telecomService.cancelOrder(session.providerOrderId, session.provider);
        }
      } catch (pollError) {
        console.error('[POLL ERROR]:', pollError.message);
      }
    }

    if (Date.now() > session.expiresAt && session.status === 'ACTIVE') {
      const refunded = await billingService.refundExpiredSession(session.id, req.user.id);

      if (session.provider !== 'twilio' && session.providerOrderId) {
        try {
          await telecomService.cancelOrder(session.providerOrderId, session.provider);
        } catch (cancelErr) {
          console.error('[CANCEL ERROR]:', cancelErr.message);
        }
      }

      session.status = 'EXPIRED';
      return res.status(410).json({
        error: 'Session has expired.',
        refundIssued: refunded,
      });
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

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (String(session.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this session.' });
    }

    if (session.provider === 'twilio') {
      await telecomService.releasePhoneNumber(
        session.subaccountSid,
        session.subaccountToken,
        session.numberSid
      );
    } else if (session.providerOrderId) {
      await telecomService.cancelOrder(session.providerOrderId, session.provider);
    }

    await sessionStore.deleteSession(req.params.phoneNumber);

    return res.status(200).json({ success: true, message: 'Number released.' });
  } catch (error) {
    console.error('[RELEASE ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to release number.', details: error.message });
  }
});

module.exports = router;