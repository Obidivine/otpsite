// src/store/sessionStore.js
const db = require('../config/db');

class SessionStore {
  async createSession(data) {
    const query = `
      INSERT INTO public.sessions (
        id, user_id, service, cost_cents,
        subaccount_sid, subaccount_token, number_sid, phone_number,
        status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
      RETURNING *;
    `;
    const values = [
      data.id,
      data.userId || null,
      data.service,
      data.costCents,
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

  async getSessionByPhone(phoneNumber) {
    const query = `
      SELECT s.*, o.code AS otp_code, o.sender AS otp_sender, o.raw_text AS otp_raw_text, o.received_at AS otp_received_at
      FROM public.sessions s
      LEFT JOIN public.otps o ON s.id = o.session_id
      WHERE s.phone_number = $1
      ORDER BY o.received_at DESC NULLS LAST
      LIMIT 1;
    `;
    const { rows } = await db.query(query, [phoneNumber]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      service: row.service,
      costCents: parseInt(row.cost_cents, 10),
      subaccountSid: row.subaccount_sid,
      subaccountToken: row.subaccount_token,
      numberSid: row.number_sid,
      phoneNumber: row.phone_number,
      status: row.status,
      expiresAt: new Date(row.expires_at).getTime(),
      refundedAt: row.refunded_at,
      otp: row.otp_code ? {
        code: row.otp_code,
        sender: row.otp_sender,
        rawText: row.otp_raw_text,
        receivedAt: row.otp_received_at
      } : null
    };
  }

  async updateSessionStatus(phoneNumber, status) {
    const query = `
      UPDATE public.sessions SET status = $1 WHERE phone_number = $2 RETURNING *;
    `;
    const { rows } = await db.query(query, [status, phoneNumber]);
    return rows[0];
  }

  async saveOtpAndCompleteSession(phoneNumber, otpData) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE public.sessions SET status = 'COMPLETED' WHERE phone_number = $1 RETURNING id;
      `;
      const res = await client.query(updateQuery, [phoneNumber]);

      if (res.rows.length > 0) {
        const sessionId = res.rows[0].id;
        const insertOtpQuery = `
          INSERT INTO public.otps (session_id, sender, raw_text, code)
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

  async deleteSession(phoneNumber) {
    const query = `DELETE FROM public.sessions WHERE phone_number = $1;`;
    await db.query(query, [phoneNumber]);
  }
}

module.exports = new SessionStore();