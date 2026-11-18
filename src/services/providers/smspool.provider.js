// src/services/providers/smspool.provider.js
const ProviderInterface = require('./provider.interface');

const API_KEY = process.env.SMSPOOL_API_KEY;
const BASE_URL = process.env.SMSPOOL_BASE_URL || 'https://api.smspool.net';

// Our internal service names mapped to SMSPool's numeric service IDs
const SERVICE_MAP = {
  whatsapp: 1012,
  telegram: 907,
  instagram: 457,
  tiktok: 924,
  signal: 829,
  // New Services Added:
  facebook: 329,
  snapchat: 846,
  linkedin: 523,
  google: 395,
  googlevoice: 396,
  "1688": 1
};

// Note: The COUNTRY_MAP has been completely removed. 
// Country IDs are now fetched from your Supabase database via telecom.service.js

class SMSPoolProvider extends ProviderInterface {
  constructor() {
    super();
    this.apiKey = API_KEY;
    this.baseUrl = BASE_URL;
  }

  /**
   * Helper: POST form-encoded request to SMSPool
   */
  async _post(path, params = {}) {
    const body = new URLSearchParams({
      key: this.apiKey,
      ...params,
    });

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`SMSPool HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buy a number. Returns normalized shape.
   * @param {number} countryId - The SMSPool numeric country ID (e.g., 53 for Mexico)
   * @param {string} serviceId - Our internal service name (e.g., 'telegram')
   */
  async buyNumber(countryId, serviceId) {
    const service = SERVICE_MAP[serviceId?.toLowerCase()];

    if (!service) {
      throw new Error(`Unsupported service for SMSPool: ${serviceId}`);
    }

    const result = await this._post('/purchase/sms', {
      country: countryId, // We now pass the numeric ID directly from the DB
      service,
      // pool: leave unspecified so SMSPool picks the best available
    });

    if (!result.success || !result.order_id) {
      const msg = result.errors?.[0]?.message || result.message || 'Unknown error';
      throw new Error(`SMSPool purchase failed: ${msg}`);
    }

    return {
      orderId: String(result.order_id),
      phoneNumber: result.number,
      costCents: Math.round(parseFloat(result.cost) * 100), // SMSPool returns USD; convert to cents
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
  }

  /**
   * Poll for SMS on a given order.
   */
  async pollForOtp(providerOrderId) {
    const result = await this._post('/sms/check', {
      orderid: providerOrderId,
    });

    // SMSPool status codes:
    // 1 = pending (waiting for SMS)
    // 3 = SMS received (success)
    // 6 = refunded (expired / canceled)
    if (result.status === 3 && result.sms) {
      return {
        code: result.code || this._extractCode(result.sms),
        sender: result.sender || 'unknown',
        rawText: result.sms,
        receivedAt: new Date().toISOString(),
      };
    }

    if (result.status === 6) {
      return { expired: true };
    }

    return null; // Still pending
  }

  /**
   * Cancel an order (auto-refund).
   */
  async cancelOrder(providerOrderId) {
    const result = await this._post('/sms/cancel', {
      orderid: providerOrderId,
    });

    return result.success === true;
  }

  /**
   * Fallback: extract 4-8 digit code from raw SMS text
   */
  _extractCode(text) {
    if (!text) return null;
    const match = text.match(/\b\d{4,8}\b/);
    return match ? match[0] : null;
  }

  // ==========================================
  // TWILIO-STYLE METHODS (not supported — throw)
  // ==========================================
  async createSubaccount() {
    throw new Error('SMSPool does not support subaccounts. Use buyNumber() instead.');
  }
  async provisionPhoneNumber() {
    throw new Error('SMSPool uses buyNumber(), not provisionPhoneNumber().');
  }
  async releasePhoneNumber() {
    throw new Error('SMSPool uses cancelOrder(), not releasePhoneNumber().');
  }
}

module.exports = new SMSPoolProvider();