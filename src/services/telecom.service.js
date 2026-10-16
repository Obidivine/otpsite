// src/services/telecom.service.js
const twilioProvider = require('./providers/twilio.provider');
const smspoolProvider = require('./providers/smspool.provider');

// ==========================================
// PROVIDER REGISTRY
// ==========================================
const providers = {
  twilio: twilioProvider,
  smspool: smspoolProvider,
  // fivesim: fivesimProvider,  <- add later
};

// Which provider is used by default for new rentals
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || 'smspool';

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

// ==========================================
// PUBLIC SERVICE API (provider-agnostic)
// ==========================================

// --- Twilio-style (webhook + subaccount) ---
async function createSubaccount(userId, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).createSubaccount(userId);
}

async function provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode);
}

async function releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid);
}

// --- Polling-style (SMSPool, 5SIM, etc.) ---
async function buyNumber(countryCode, serviceId, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).buyNumber(countryCode, serviceId);
}

async function pollForOtp(providerOrderId, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).pollForOtp(providerOrderId);
}

async function cancelOrder(providerOrderId, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).cancelOrder(providerOrderId);
}

module.exports = {
  // Twilio-style
  createSubaccount,
  provisionPhoneNumber,
  releasePhoneNumber,
  // Polling-style
  buyNumber,
  pollForOtp,
  cancelOrder,
  // Utility
  getProvider,
  DEFAULT_PROVIDER,
};