// src/services/telecom.service.js
const twilio = require('twilio');

// Initialize parent client using Master API credentials
const masterClient = twilio(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Creates an isolated subaccount for a user session to contain risk/abuse.
 */
async function createSubaccount(userId) {
  const subaccount = await masterClient.api.v2010.accounts.create({
    friendlyName: `Session_${userId}_${Date.now()}`
  });
  return subaccount;
}

/**
 * Searches for and purchases an SMS-capable phone number,
 * then points its SMS Webhook to our backend server URL.
 */
async function provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode) {
  // Create an API client scoped specifically to the new subaccount
  const subClient = twilio(subaccountSid, subaccountAuthToken);

  // 1. Find available numbers in the target country
  const available = await subClient
    .availablePhoneNumbers(countryCode)
    .local
    .list({ smsEnabled: true, limit: 1 });

  if (!available || available.length === 0) {
    throw new Error(`No available SMS numbers found for country: ${countryCode}`);
  }

  const phoneNumberToBuy = available[0].phoneNumber;

  // 2. Buy the number and register our Inbound Webhook URL
  const webhookUrl = `${process.env.SERVER_BASE_URL}/api/v1/webhooks/sms/inbound`;

  const purchased = await subClient.incomingPhoneNumbers.create({
    phoneNumber: phoneNumberToBuy,
    smsUrl: webhookUrl,
    smsMethod: 'POST' // Twilio will send HTTP POST requests to this URL
  });

  return {
    phoneNumber: purchased.phoneNumber,
    numberSid: purchased.sid
  };
}

/**
 * Programmatically releases/deletes a phone number when the session finishes.
 */
async function releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid) {
  const subClient = twilio(subaccountSid, subaccountAuthToken);
  await subClient.incomingPhoneNumbers(numberSid).remove();
}

module.exports = {
  createSubaccount,
  provisionPhoneNumber,
  releasePhoneNumber
};