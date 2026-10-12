// src/services/scheduler.service.js
const { Client } = require('@upstash/qstash');

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN });

class SchedulerService {
  /**
   * Schedule an automated refund & release webhook call 16 minutes from now
   */
  async scheduleSessionExpiry(sessionId, phoneNumber) {
    if (!process.env.QSTASH_TOKEN) {
      console.warn('[QSTASH WARNING] QSTASH_TOKEN not configured. Background job skipped.');
      return;
    }

    const targetUrl = `${process.env.SERVER_BASE_URL}/api/v1/webhooks/qstash/expire-session`;

    try {
      await qstashClient.publishJSON({
        url: targetUrl,
        delay: '16m',
        body: { sessionId, phoneNumber },
      });
      console.log(`[QSTASH] Scheduled expiry webhook for session ${sessionId} in 16 minutes.`);
    } catch (err) {
      console.error('[QSTASH SCHEDULING ERROR]:', err.message);
      throw err; // Rethrow so the caller can log it; route will not fail the rental
    }
  }
}

module.exports = new SchedulerService();