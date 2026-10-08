// src/services/billing.service.js
const db = require('../config/db');

// Cost per rental in KOBO/CENTS (100 = $1.00 or ₦1.00)
const RENTAL_COST_KOBO = parseInt(process.env.RENTAL_COST_KOBO || '100', 10);

class BillingService {
  /**
   * TRANSACTION A: Atomic Balance Check & Deduct
   * Runs when a user requests a rental. Locks the user row, checks balance,
   * deducts the cost, and records a HOLD transaction. All in ~10ms.
   */
  async holdRentalFunds(userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock the user row (prevents concurrent double-spend)
      const userRes = await client.query(
        `SELECT balance FROM public.users WHERE id = $1 FOR UPDATE;`,
        [userId]
      );

      if (userRes.rows.length === 0) {
        const err = new Error('User account not found.');
        err.statusCode = 404;
        throw err;
      }

      const balanceKobo = parseInt(userRes.rows[0].balance, 10);

      if (balanceKobo < RENTAL_COST_KOBO) {
        const err = new Error(
          `Insufficient funds. Required: ${RENTAL_COST_KOBO} kobo, Available: ${balanceKobo} kobo.`
        );
        err.statusCode = 402;
        throw err;
      }

      // 2. Deduct funds
      await client.query(
        `UPDATE public.users SET balance = balance - $1 WHERE id = $2;`,
        [RENTAL_COST_KOBO, userId]
      );

      // 3. Record HOLD transaction in ledger
      const holdReference = `hold_${userId}_${Date.now()}`;
      await client.query(
        `INSERT INTO public.transactions (user_id, amount, type, reference, status, notes)
         VALUES ($1, $2, 'HOLD', $3, 'COMPLETED', 'Temporary hold for phone rental');`,
        [userId, -RENTAL_COST_KOBO, holdReference]
      );

      await client.query('COMMIT');
      return { holdReference, amountKobo: RENTAL_COST_KOBO };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * TRANSACTION C: Compensating Refund (Twilio provisioning failure)
   * Called when the telecom provider fails AFTER we've already held the funds.
   */
  async compensateFailedRental(userId, holdReference, failureReason) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock user row
      await client.query(
        `SELECT id FROM public.users WHERE id = $1 FOR UPDATE;`,
        [userId]
      );

      // 2. Credit funds back
      await client.query(
        `UPDATE public.users SET balance = balance + $1 WHERE id = $2;`,
        [RENTAL_COST_KOBO, userId]
      );

      // 3. Record REFUND transaction
      const refundReference = `refund_fail_${holdReference}`;
      await client.query(
        `INSERT INTO public.transactions (user_id, amount, type, reference, status, notes)
         VALUES ($1, $2, 'REFUND', $3, 'COMPLETED', $4);`,
        [userId, RENTAL_COST_KOBO, refundReference, `Compensating refund: ${failureReason}`]
      );

      await client.query('COMMIT');
      console.log(`[REFUND SUCCESS] User ${userId} credited ${RENTAL_COST_KOBO} kobo.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CRITICAL REFUND ERROR]', userId, err.message);
      // Note: we swallow this error so the route can still return 502 to the user.
      // In production, this should alert monitoring.
    } finally {
      client.release();
    }
  }

  /**
   * TRANSACTION D: Idempotent Expiry Refund
   * Called when a session expires without receiving an OTP.
   * Uses `refunded_at` to guarantee a session is only refunded once.
   */
  async refundExpiredSession(sessionId, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock session row and check idempotency
      const sessionRes = await client.query(
        `SELECT id, status, refunded_at FROM public.sessions WHERE id = $1 FOR UPDATE;`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const session = sessionRes.rows[0];

      if (session.refunded_at !== null || session.status === 'COMPLETED') {
        // Already refunded or OTP was received — no refund
        await client.query('ROLLBACK');
        return false;
      }

      // 2. Mark session as EXPIRED + stamp refunded_at
      await client.query(
        `UPDATE public.sessions SET status = 'EXPIRED', refunded_at = NOW() WHERE id = $1;`,
        [sessionId]
      );

      // 3. Refund user wallet
      await client.query(
        `UPDATE public.users SET balance = balance + $1 WHERE id = $2;`,
        [RENTAL_COST_KOBO, userId]
      );

      // 4. Log REFUND transaction
      const refundRef = `refund_exp_${sessionId}`;
      await client.query(
        `INSERT INTO public.transactions (user_id, session_id, amount, type, reference, status, notes)
         VALUES ($1, $2, $3, 'REFUND', $4, 'COMPLETED', 'Automatic refund for expired session');`,
        [userId, sessionId, RENTAL_COST_KOBO, refundRef]
      );

      await client.query('COMMIT');
      return true;

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[EXPIRY REFUND FAILED] Session ${sessionId}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new BillingService();