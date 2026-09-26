// src/store/sessionStore.js
const db = require('../config/db');

class SessionStore {
  /**
   * Persist a new session record into PostgreSQL
   */
  async createSession(data) {
    const query = `
      INSERT INTO sessions (
        id, user_id, service, subaccount_sid, subaccount_token, 
        number_sid, phone_number, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0))
      RETURNING *;
    `;
    const values = [
      data.id,
      data.userId || null,
      data.service,
      data.subaccountSid,
      data.subaccountToken,
      data.numberSid,
      data.phoneNumber,
      data.status,
      data.expiresAt
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Fetch active session and optional OTP payload by phone number
   */
  async getSessionByPhone(phoneNumber) {
    const query = `
      SELECT s.*, o.code as otp_code, o.sender as otp_sender, o.raw_text as otp_raw_text, o.received_at as otp_received_at
      FROM sessions s
      LEFT JOIN otps o ON s.id = o.session_id
WHERE s.phone_number = $1
ORDER BY o.received_at DESC NULLS LAST
LIMIT 1;
    `;
    const { rows } = await db.query(query, [phoneNumber]);
    if (rows.length === 0) return null;

    const row = rows[0];
    
    // Map flat SQL response into domain object matching Phase 1 shape
    return {
      id: row.id,
      userId: row.user_id,
      service: row.service,
      subaccountSid: row.subaccount_sid,
      subaccountToken: row.subaccount_token,
      numberSid: row.number_sid,
      phoneNumber: row.phone_number,
      status: row.status,
      expiresAt: new Date(row.expires_at).getTime(),
      otp: row.otp_code ? {
        code: row.otp_code,
        sender: row.otp_sender,
        rawText: row.otp_raw_text,
        receivedAt: row.otp_received_at
      } : null
    };
  }

  /**
   * Update session status
   */
  async updateSessionStatus(phoneNumber, status) {
    const query = `
      UPDATE sessions 
      SET status = $1 
      WHERE phone_number = $2 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [status, phoneNumber]);
    return rows[0];
  }

  /**
   * Save extracted OTP payload and transition session state
   */
  async saveOtpAndCompleteSession(phoneNumber, otpData) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Mark session COMPLETED
      const updateQuery = `
        UPDATE sessions SET status = 'COMPLETED' WHERE phone_number = $1 RETURNING id;
      `;
      const res = await client.query(updateQuery, [phoneNumber]);

      if (res.rows.length > 0) {
        const sessionId = res.rows[0].id;

        // 2. Insert OTP Record
        const insertOtpQuery = `
          INSERT INTO otps (session_id, sender, raw_text, code)
          VALUES ($1, $2, $3, $4);
        `;
        await client.query(insertOtpQuery, [
          sessionId,
          otpData.sender,
          otpData.rawText,
          otpData.code
        ]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Remove session record
   */
  async deleteSession(phoneNumber) {
    const query = `DELETE FROM sessions WHERE phone_number = $1;`;
    await db.query(query, [phoneNumber]);
  }
}

module.exports = new SessionStore();