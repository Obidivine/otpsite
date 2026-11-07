// src/services/telecom.service.js
const smspoolProvider = require('./providers/smspool.provider');

// ==========================================
// PROVIDER REGISTRY
// ==========================================
const providers = {
  smspool: smspoolProvider,
};

// Locked to SMSPool
const DEFAULT_PROVIDER = 'smspool';

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

// ==========================================
// PUBLIC SERVICE API
// ==========================================

// These Twilio methods now throw an error if called, but we'll remove them from the routes anyway
async function createSubaccount(userId) {
  throw new Error('Twilio has been removed. Use buyNumber() instead.');
}

async function provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode) {
  throw new Error('Twilio has been removed. Use buyNumber() instead.');
}

async function releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid) {
  throw new Error('Twilio has been removed. Use cancelOrder() instead.');
}

// --- Polling-style (SMSPool) ---
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
  createSubaccount,
  provisionPhoneNumber,
  releasePhoneNumber,
  buyNumber,
  pollForOtp,
  cancelOrder,
  getProvider,
  DEFAULT_PROVIDER,
};