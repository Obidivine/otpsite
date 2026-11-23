// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
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
    
    // SECURITY TIP: Always return 200 success even if email doesn't exist! 
    // This prevents hackers from testing which emails are registered on your site.
    if (userRes.rows.length === 0) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const userId = userRes.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save to DB (delete old ones for this user first)
    await db.query('DELETE FROM public.password_resets WHERE user_id = $1', [userId]);
    await db.query(
      'INSERT INTO public.password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // Send Email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    await transporter.sendMail({
      from: '"OTP360 Support" <otpreseller360@gmail.com>',
      to: email,
      subject: 'Reset your OTP360 Password',
      html: `
        <h3>Password Reset Request</h3>
        <p>You requested to reset your password. Click the link below to set a new one:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
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