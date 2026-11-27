const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../config/db'); // Need this to get user email
const sessionStore = require('../store/sessionStore');
const telecomService = require('../services/telecom.service');
const billingService = require('../services/billing.service');

// Setup Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// POST /api/v1/webhooks/qstash/expire-session
router.post('/qstash/expire-session', async (req, res) => {
  const { sessionId, phoneNumber } = req.body;

  try {
    const session = await sessionStore.getSessionByPhone(phoneNumber);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // If it's already completed or expired, do nothing
    if (session.status !== 'ACTIVE') {
      return res.status(200).json({ status: 'ignored', reason: 'Session not active.' });
    }

    // 1. Mark EXPIRED
    await sessionStore.updateSessionStatus(phoneNumber, 'EXPIRED');

    // 2. Cancel with SMSPool
    if (session.providerOrderId) {
      try {
        await telecomService.cancelOrder(session.providerOrderId, session.provider);
      } catch (err) {
        console.error('[QSTASH CANCEL ERROR]:', err.message);
      }
    }

    // 3. Refund User
    await billingService.refundExpiredSession(session.id, session.userId);

    // 4. SEND AUTOMATED EMAIL TO USER
    try {
      const userRes = await db.query('SELECT email FROM public.users WHERE id = $1', [session.userId]);
      if (userRes.rows.length > 0) {
        const userEmail = userRes.rows[0].email;
        const costNaira = (session.costCents / 100).toLocaleString('en-NG');
        
        await transporter.sendMail({
          from: '"OTP360 Support" <otpreseller360@gmail.com>',
          to: userEmail,
          subject: 'Your OTP360 Session Expired (Refunded)',
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
                <h2 style="color: #ffffff; margin-bottom: 20px;">Session Expired & Refunded</h2>
                <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
                  Hi there,
                </p>
                <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
                  We noticed your recent session for <strong>${session.service}</strong> expired without receiving a code. 
                  We have automatically refunded the <strong>₦${costNaira}</strong> back to your OTP360 wallet.
                </p>
                <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
                  <p style="margin: 0; color: #60a5fa; font-size: 14px;"><strong>Why did this happen?</strong></p>
                  <ul style="color: #94a3b8; font-size: 14px; margin-top: 10px; padding-left: 20px;">
                    <li>Your app (WhatsApp, Telegram, etc.) may not be updated.</li>
                    <li>Your VPN location might not match the country of the number.</li>
                    <li>The service may have temporarily blocked virtual numbers.</li>
                  </ul>
                </div>
                <p style="color: #94a3b8; font-size: 14px;">
                  If you need help, just reply to this email or message us on WhatsApp.
                </p>
                <a href="https://otp360.store/dashboard" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px;">
                  Go to Dashboard
                </a>
              </div>
            </div>
          `,
        });
        console.log(`[EMAIL SENT] Expiry notice sent to ${userEmail}`);
      }
    } catch (emailErr) {
      console.error('[EXPIRY EMAIL ERROR]:', emailErr.message);
      // We don't return a 500 here because the refund already succeeded!
    }

    console.log(`[QSTASH SUCCESS] Expired and refunded session ${sessionId}`);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[QSTASH WEBHOOK ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to process expiry.' });
  }
});

module.exports = router;