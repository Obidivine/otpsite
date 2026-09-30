// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');

// POST /api/v1/auth/signup
router.post('/signup', async (req, res) => {
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
router.post('/login', async (req, res) => {
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

module.exports = router;