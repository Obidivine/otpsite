// src/services/providers/twilio.provider.js
const twilio = require('twilio');
const ProviderInterface = require('./provider.interface');

class TwilioProvider extends ProviderInterface {
  constructor() {
    super();
    this.masterClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async createSubaccount(userId) {
    const subaccount = await this.masterClient.api.v2010.accounts.create({
      friendlyName: `Session_${userId}_${Date.now()}`
    });
    return subaccount;
  }

  async provisionPhoneNumber(subaccountSid, subaccountAuthToken, countryCode) {
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

  async releasePhoneNumber(subaccountSid, subaccountAuthToken, numberSid) {
    const subClient = twilio(subaccountSid, subaccountAuthToken);
    await subClient.incomingPhoneNumbers(numberSid).remove();
  }
}

module.exports = new TwilioProvider();