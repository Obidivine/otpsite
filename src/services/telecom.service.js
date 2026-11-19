// src/services/telecom.service.js
const smspoolProvider = require('./providers/smspool.provider');
const db = require('../config/db'); // <-- IMPORT DB HERE

// ==========================================
// PROVIDER REGISTRY
// ==========================================
const providers = {
  smspool: smspoolProvider,
};

const DEFAULT_PROVIDER = 'smspool';

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

// Add this helper function at the top of telecom.service.js
async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err; // Throw if last attempt fails
      await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
    }
  }
}

// Then, replace your existing `fetch(...)` calls with:
// const response = await fetchWithRetry('https://api.smspool.net/...', { ... });

// ... (keep the Twilio throw methods) ...

// --- Polling-style (SMSPool) ---
async function buyNumber(countryCode, serviceId, providerName = DEFAULT_PROVIDER) {
  // 1. Look up the SMSPool numeric ID from the database
  const { rows } = await db.query(
    'SELECT smspool_id FROM public.countries WHERE code = $1',
    [countryCode.toUpperCase()]
  );

  if (rows.length === 0 || !rows[0].smspool_id) {
    throw new Error(`Country ${countryCode} is missing an SMSPool ID in the database.`);
  }

  const smspoolCountryId = rows[0].smspool_id;

  // 2. Pass the numeric ID to the provider
  return getProvider(providerName).buyNumber(smspoolCountryId, serviceId);
}

async function pollForOtp(providerOrderId, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).pollForOtp(providerOrderId);
}

async function cancelOrder(providerOrderId, providerName = DEFAULT_PROVIDER) {
  return getProvider(providerName).cancelOrder(providerOrderId);
}

module.exports = {
  // ... exports remain the same
  buyNumber,
  pollForOtp,
  cancelOrder,
  getProvider,
  DEFAULT_PROVIDER,
};