// src/services/user.service.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SALT_ROUNDS = 10;

class UserService {
  async createUser(email, password) {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      const error = new Error('Email is already registered.');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const query = `
      INSERT INTO public.users (email, password_hash, balance)
      VALUES ($1, $2, 0.00)
      RETURNING id, email, balance, created_at;
    `;
    const { rows } = await db.query(query, [email.toLowerCase().trim(), hashedPassword]);
    return rows[0];
  }

  async authenticateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateJwt(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        balance: parseFloat(user.balance)
      }
    };
  }

  async findUserByEmail(email) {
    const query = `SELECT * FROM public.users WHERE email = $1;`;
    const { rows } = await db.query(query, [email.toLowerCase().trim()]);
    return rows[0] || null;
  }

  generateJwt(userId, email) {
    return jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}

module.exports = new UserService();