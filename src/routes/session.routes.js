// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const telecomService = require('../services/telecom.service');
const { activeSessions } = require('../store/memoryStore');

/**
 * POST /api/v1/sessions/rent
 * Rent a temporary number for a given service & country.
 */
router.post('/rent', async (req, res) => {
  const { userId, country = 'US', service } = req.body;

  if (!userId || !service) {
    return res.status(400).json({ error: 'userId and service are required fields.' });
  }

  try {
    // 1. Create Subaccount
    const subaccount = await telecomService.createSubaccount(userId);

    // 2. Provision Phone Number & Set Webhook
    const provisioned = await telecomService.provisionPhoneNumber(
      subaccount.sid,
      subaccount.authToken,
      country
    );

    // 3. Register Session in Store
    const sessionId = `sess_${Date.now()}`;
    const sessionData = {
      id: sessionId,
      userId,
      service,
      subaccountSid: subaccount.sid,
      subaccountToken: subaccount.authToken,
      numberSid: provisioned.numberSid,
      phoneNumber: provisioned.phoneNumber,
      status: 'ACTIVE',
      otp: null,
      expiresAt: Date.now() + (15 * 60 * 1000) // 15-minute countdown
    };

    // Store by phone number key so incoming webhooks can look it up instantly
    activeSessions.set(provisioned.phoneNumber, sessionData);

    return res.status(200).json({
      success: true,
      sessionId: sessionData.id,
      phoneNumber: sessionData.phoneNumber,
      service: sessionData.service,
      expiresAt: sessionData.expiresAt
    });

  } catch (error) {
    console.error('Rental Failed:', error.message);
    return res.status(500).json({ error: 'Failed to provision number.', details: error.message });
  }
});

/**
 * GET /api/v1/sessions/:phoneNumber
 * Polling route to check session status and retrieve extracted OTP.
 */
router.get('/:phoneNumber', (req, res) => {
  const session = activeSessions.get(req.params.phoneNumber);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }
  return res.status(200).json(session);
});

module.exports = router;