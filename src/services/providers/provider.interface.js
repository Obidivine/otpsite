// src/services/providers/provider.interface.js

class ProviderInterface {
  async createSubaccount(userId) {
    throw new Error('Method createSubaccount() must be implemented');
  }

  async provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode) {
    throw new Error('Method provisionPhoneNumber() must be implemented');
  }

  async releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid) {
    throw new Error('Method releasePhoneNumber() must be implemented');
  }
}

module.exports = ProviderInterface;