// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const telecomService = require('../services/telecom.service');
const { activeSessions } = require('../store/memorystore');

// Rent number
router.post('/rent', async (req, res) => {
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
      otp: null,
      expiresAt: Date.now() + (15 * 60 * 1000)
    };

    activeSessions.set(provisioned.phoneNumber, sessionData);

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

// Get session status (with expiry check)
router.get('/:phoneNumber', (req, res) => {
  const session = activeSessions.get(req.params.phoneNumber);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (Date.now() > session.expiresAt && session.status === 'ACTIVE') {
    session.status = 'EXPIRED';
    activeSessions.set(req.params.phoneNumber, session);
    return res.status(410).json({ error: 'Session has expired.' });
  }

  return res.status(200).json(session);
});

// Manual release
router.post('/:phoneNumber/release', async (req, res) => {
  const session = activeSessions.get(req.params.phoneNumber);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  try {
    await telecomService.releasePhoneNumber(session.subaccountSid, session.subaccountToken, session.numberSid);
    session.status = 'RELEASED';
    activeSessions.delete(req.params.phoneNumber);

    return res.status(200).json({ success: true, message: 'Number released.' });
  } catch (error) {
    console.error('[RELEASE ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to release number.', details: error.message });
  }
});

module.exports = router;