// src/services/providers/provider.interface.js

class ProviderInterface {
  // ==========================================
  // TWILIO-STYLE METHODS
  // Providers with subaccounts + webhooks implement these.
  // ==========================================
  async createSubaccount(userId) {
    throw new Error('Method createSubaccount() must be implemented');
  }

  async provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode) {
    throw new Error('Method provisionPhoneNumber() must be implemented');
  }

  async releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid) {
    throw new Error('Method releasePhoneNumber() must be implemented');
  }

  // ==========================================
  // POLLING-STYLE METHODS (SMSPool, 5SIM, etc.)
  // Providers without subaccounts or webhooks implement these.
  // Return null if the provider doesn't support them.
  // ==========================================

  /**
   * Buy a number. Returns { orderId, phoneNumber, costCents, expiresAt }.
   */
  async buyNumber(countryCode, serviceId) {
    throw new Error('Method buyNumber() must be implemented');
  }

  /**
   * Poll for the SMS on a given order.
   * Returns { code, sender, rawText, receivedAt } or null if not yet arrived.
   */
  async pollForOtp(providerOrderId) {
    throw new Error('Method pollForOtp() must be implemented');
  }

  /**
   * Cancel an order (triggers auto-refund on most providers).
   */
  async cancelOrder(providerOrderId) {
    throw new Error('Method cancelOrder() must be implemented');
  }
}

module.exports = ProviderInterface;