// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const telecomService = require('../services/telecom.service');
const sessionStore = require('../store/sessionStore');

// Rent number
router.post('/rent', async (req, res, next) => {
  const { userId, country = 'US', service } = req.body;

  if (!userId || !service) {
    return res.status(400).json({ error: 'userId and service are required.' });
  }

  try {
    const subaccount = await telecomService.createSubaccount(userId);
    const provisioned = await telecomService.provisionPhoneNumber(
      subaccount.sid,
      subaccount.authToken,
      country
    );

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

    // Await async SQL insertion
    await sessionStore.createSession(sessionData);

    return res.status(200).json({
      success: true,
      sessionId: sessionData.id,
      phoneNumber: sessionData.phoneNumber,
      service: sessionData.service,
      expiresAt: sessionData.expiresAt
    });

  } catch (error) {
    console.error('[RENTAL ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to provision number.', details: error.message });
  }
});

// Get session status (with async SQL lookup & expiry check)
router.get('/:phoneNumber', async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (Date.now() > session.expiresAt && session.status === 'ACTIVE') {
      await sessionStore.updateSessionStatus(req.params.phoneNumber, 'EXPIRED');
      session.status = 'EXPIRED';
      return res.status(410).json({ error: 'Session has expired.' });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error('[GET SESSION ERROR]:', error.message);
    return res.status(500).json({ error: 'Database query failed.' });
  }
});

// Manual release
router.post('/:phoneNumber/release', async (req, res) => {
  try {
    const session = await sessionStore.getSessionByPhone(req.params.phoneNumber);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    await telecomService.releasePhoneNumber(session.subaccountSid, session.subaccountToken, session.numberSid);
    await sessionStore.deleteSession(req.params.phoneNumber);

    return res.status(200).json({ success: true, message: 'Number released.' });
  } catch (error) {
    console.error('[RELEASE ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to release number.', details: error.message });
  }
});

module.exports = router;