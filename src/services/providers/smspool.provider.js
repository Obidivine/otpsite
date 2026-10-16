// src/services/providers/smspool.provider.js
const ProviderInterface = require('./provider.interface');

const API_KEY = process.env.SMSPOOL_API_KEY;
const BASE_URL = process.env.SMSPOOL_BASE_URL || 'https://api.smspool.net';

// Map our internal service IDs to SMSPool's service IDs
const SERVICE_MAP = {
  whatsapp: 1,        // SMSPool uses numeric service IDs
  telegram: 2,
  instagram: 3,
  tiktok: 4,
  signal: 5,
  // Add more as SMSPool adds them: https://smspool.net/services
};

// Map our country codes to SMSPool's country IDs
const COUNTRY_MAP = {
  US: 1,
  UK: 16,
  CA: 2,
  NL: 15,
  DE: 7,
  // Full list: https://smspool.net/countries
};

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
   */
  async buyNumber(countryCode, serviceId) {
    const country = COUNTRY_MAP[countryCode?.toUpperCase()];
    const service = SERVICE_MAP[serviceId?.toLowerCase()];

    if (!country) {
      throw new Error(`Unsupported country for SMSPool: ${countryCode}`);
    }
    if (!service) {
      throw new Error(`Unsupported service for SMSPool: ${serviceId}`);
    }

    const result = await this._post('/purchase/sms', {
      country,
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
