// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const db = require('../config/db');
const bcrypt = require('bcrypt');
const { authLimiter } = require('../middleware/ratelimit.middleware');

// POST /api/v1/auth/signup
router.post('/signup', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const user = await userService.createUser(email, password);
    const token = userService.generateJwt(user.id, user.email);

    return res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await userService.authenticateUser(email, password);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message });
  }
});

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Setup transporter (add this near the top of the file)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 1. REQUEST PASSWORD RESET


router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const userRes = await db.query('SELECT id FROM public.users WHERE email = $1', [email]);
    
    if (userRes.rows.length === 0) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const userId = userRes.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query('DELETE FROM public.password_resets WHERE user_id = $1', [userId]);
    await db.query(
      'INSERT INTO public.password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    // Styled HTML Email Template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-bottom: 20px;">Reset your OTP360 Password</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello,</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          We received a request to reset the password for your OTP360 account. Click the button below to choose a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset My Password
          </a>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          This link is valid for <strong>15 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
            <strong>Didn't see this email in your inbox?</strong><br>
            Please check your <strong>Spam or Junk folder</strong>. To ensure future emails arrive safely, mark this message as "Not Spam".
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"OTP360 Support" <otpreseller360@gmail.com>',
      to: email,
      subject: 'Reset your OTP360 Password',
      html: emailHtml,
    });

    return res.status(200).json({ success: true, message: 'Email sent.' });

  } catch (err) {
    console.error('[FORGOT PASSWORD ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to process request.' });
  }
});

// 2. RESET PASSWORD WITH TOKEN
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  try {
    // Find valid token
    const resetRes = await db.query(
      'SELECT user_id FROM public.password_resets WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (resetRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const userId = resetRes.rows[0].user_id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.query('UPDATE public.users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);

    // Delete the token so it can't be reused
    await db.query('DELETE FROM public.password_resets WHERE token = $1', [token]);

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });

  } catch (err) {
    console.error('[RESET PASSWORD ERROR]:', err.message);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;