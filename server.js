// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();

// ==========================================
// 1. MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 2. STATE & CLIENT
// ==========================================
const activeSessions = new Map();

const masterClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ==========================================
// 3. UPSTREAM HELPERS
// ==========================================
async function createSubaccount(userId) {
  return await masterClient.api.v2010.accounts.create({
    friendlyName: `Session_${userId}_${Date.now()}`
  });
}

async function provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode) {
  const subClient = twilio(subaccountSid, subaccountAuthToken);

  const available = await subClient
    .availablePhoneNumbers(countryCode)
    .local
    .list({ smsEnabled: true, limit: 1 });

  if (!available || available.length === 0) {
    throw new Error(`No available SMS numbers for country: ${countryCode}`);
  }

  const phoneNumberToBuy = available[0].phoneNumber;
  const webhookUrl = `${process.env.SERVER_BASE_URL}/api/v1/webhooks/sms/inbound`;

  const purchased = await subClient.incomingPhoneNumbers.create({
    phoneNumber: phoneNumberToBuy,
    smsUrl: webhookUrl,
    smsMethod: 'POST'
  });

  return {
    phoneNumber: purchased.phoneNumber,
    numberSid: purchased.sid
  };
}

async function releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid) {
  const subClient = twilio(subaccountSid, subaccountAuthToken);
  await subClient.incomingPhoneNumbers(numberSid).remove();
}

// ==========================================
// 4. ROUTES
// ==========================================

// Health
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'OK', activeSessionsCount: activeSessions.size });
});

// Rent number
app.post('/api/v1/sessions/rent', async (req, res) => {
  const { userId, country = 'US', service } = req.body;

  if (!userId || !service) {
    return res.status(400).json({ error: 'userId and service are required.' });
  }

  try {
    const subaccount = await createSubaccount(userId);
    const provisioned = await provisionPhoneNumber(
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
app.get('/api/v1/sessions/:phoneNumber', (req, res) => {
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
app.post('/api/v1/sessions/:phoneNumber/release', async (req, res) => {
  const session = activeSessions.get(req.params.phoneNumber);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  try {
    await releasePhoneNumber(session.subaccountSid, session.subaccountToken, session.numberSid);
    session.status = 'RELEASED';
    activeSessions.delete(req.params.phoneNumber);

    return res.status(200).json({ success: true, message: 'Number released.' });
  } catch (error) {
    console.error('[RELEASE ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to release number.', details: error.message });
  }
});

// Inbound SMS webhook
app.post('/api/v1/webhooks/sms/inbound', (req, res) => {
  const { To, From, Body } = req.body;

  console.log(`\n[INBOUND SMS] To: ${To} | From: ${From} | Body: "${Body}"\n`);

  const session = activeSessions.get(To);

  if (!session || session.status !== 'ACTIVE') {
    res.type('text/xml');
    return res.status(200).send('<Response></Response>');
  }

  const codeMatch = Body ? Body.match(/\b\d{4,8}\b/) : null;
  const parsedCode = codeMatch ? codeMatch[0] : null;

  session.status = 'COMPLETED';
  session.otp = {
    sender: From,
    rawText: Body,
    code: parsedCode,
    receivedAt: new Date().toISOString()
  };

  activeSessions.set(To, session);

  res.type('text/xml');
  return res.status(200).send('<Response></Response>');
});

// ==========================================
// 5. START SERVER (LAST)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`[Phase 1 Server Active] Running on port ${PORT}`);
  console.log(`==============================================\n`);
});