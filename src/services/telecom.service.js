// src/services/telecom.service.js
const twilioProvider = require('./providers/twilio.provider');

// ==========================================
// PROVIDER REGISTRY
// ==========================================
// To add 5SIM, SMS-Activate, etc. later:
//   1. Create src/services/providers/fivesim.provider.js implementing ProviderInterface
//   2. Add it to the registry below
//   3. Pick it via PROVIDER env var or per-request param
// ==========================================
const providers = {
  twilio: twilioProvider
  // fivesim: fivesimProvider,   <- add later
  // smsactivate: smsActivateProvider,
};

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
async function createSubaccount(userId, providerName = 'twilio') {
  return getProvider(providerName).createSubaccount(userId);
}

async function provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode, providerName = 'twilio') {
  return getProvider(providerName).provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode);
}

async function releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid, providerName = 'twilio') {
  return getProvider(providerName).releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid);
}

module.exports = {
  createSubaccount,
  provisionPhoneNumber,
  releasePhoneNumber,
  getProvider
};