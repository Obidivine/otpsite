// src/services/scheduler.service.js

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
  delay: '16m', // Your existing 16-minute timer
  body: { sessionId, phoneNumber },
  retries: 3, // Retry up to 3 times if your Railway server is down
  retryDelay: "pow(2, retried) * 1000", // 1s, 2s, 4s (exponential backoff)
});
      console.log(`[QSTASH] Scheduled expiry webhook for session ${sessionId} in 16 minutes.`);
    } catch (err) {
      console.error('[QSTASH SCHEDULING ERROR]:', err.message);
      throw err; // Rethrow so the caller can log it; route will not fail the rental
    }
  }
}

module.exports = new SchedulerService();