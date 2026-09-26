// src/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const sessionStore = require('../store/sessionStore');

// Inbound SMS webhook
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

    // Save OTP and set status = COMPLETED within a DB transaction
    await sessionStore.saveOtpAndCompleteSession(To, {
      sender: From,
      rawText: Body,
      code: parsedCode
    });

    res.type('text/xml');
    return res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('[WEBHOOK PROCESSING ERROR]:', error.message);
    // Respond with 200 to prevent provider from retrying infinitely on DB failure
    res.type('text/xml');
    return res.status(200).send('<Response></Response>');
  }
});

module.exports = router;