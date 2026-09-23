// src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const { activeSessions } = require('../store/memoryStore');

/**
 * POST /api/v1/webhooks/sms/inbound
 * Gateway hit by upstream telecom whenever an incoming SMS arrives.
 */
router.post('/sms/inbound', (req, res) => {
  // Twilio sends urlencoded body parameters: To, From, Body
  const { To, From, Body } = req.body;

  console.log(`[INBOUND SMS] To: ${To} | From: ${From} | Body: "${Body}"`);

  // 1. Match SMS to Active Session
  const session = activeSessions.get(To);

  if (!session || session.status !== 'ACTIVE') {
    // Send 200 OK so provider doesn't endlessly retry sending this payload
    return res.status(200).send('<Response></Response>');
  }

  // 2. RegEx OTP Extraction Engine
  // Looks for standalone 4 to 8 digit numbers in the text body
  const codeMatch = Body.match(/\b\d{4,8}\b/);
  const parsedCode = codeMatch ? codeMatch[0] : null;

  // 3. Update Session State
  session.status = 'COMPLETED';
  session.otp = {
    sender: From,
    rawText: Body,
    code: parsedCode,
    receivedAt: new Date().toISOString()
  };

  activeSessions.set(To, session);

  // 4. Return TwiML response to satisfy Twilio HTTP client specs
  res.type('text/xml');
  return res.status(200).send('<Response></Response>');
});

module.exports = router;