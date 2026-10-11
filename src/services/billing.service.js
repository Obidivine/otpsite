// src/services/billing.service.js
const db = require('../config/db');

class BillingService {
  /**
   * TRANSACTION A: Atomic Balance Check & Hold (USD Cents)
   */
  async holdRentalFunds(userId, costCents) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(
        `SELECT balance_cents FROM public.users WHERE id = $1 FOR UPDATE;`,
        [userId]
      );

      if (userRes.rows.length === 0) {
        const err = new Error('User account not found.');
        err.statusCode = 404;
        throw err;
      }

      const balanceCents = parseInt(userRes.rows[0].balance_cents, 10);

      if (balanceCents < costCents) {
        const err = new Error(`Insufficient balance. Required: ${costCents} cents, Available: ${balanceCents} cents.`);
        err.statusCode = 402;
        throw err;
      }

      await client.query(
        `UPDATE public.users SET balance_cents = balance_cents - $1 WHERE id = $2;`,
        [costCents, userId]
      );

      const holdReference = `hold_${userId}_${Date.now()}`;
      await client.query(
        `INSERT INTO public.transactions (user_id, amount_cents, type, reference, status, notes)
         VALUES ($1, $2, 'HOLD', $3, 'COMPLETED', 'Temporary hold for number rental');`,
        [userId, -costCents, holdReference]
      );

      await client.query('COMMIT');
      return { holdReference, amountCents: costCents };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * TRANSACTION C: Compensation Refund (Provisioning Failure)
   */
  async compensateFailedRental(userId, holdReference, costCents, failureReason) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `SELECT id FROM public.users WHERE id = $1 FOR UPDATE;`,
        [userId]
      );

      await client.query(
        `UPDATE public.users SET balance_cents = balance_cents + $1 WHERE id = $2;`,
        [costCents, userId]
      );

      const refundReference = `refund_fail_${holdReference}`;
      await client.query(
        `INSERT INTO public.transactions (user_id, amount_cents, type, reference, status, notes)
         VALUES ($1, $2, 'REFUND', $3, 'COMPLETED', $4);`,
        [userId, costCents, refundReference, `Compensating refund: ${failureReason}`]
      );

      await client.query('COMMIT');
      console.log(`[REFUND SUCCESS] User ${userId} credited ${costCents} cents.`);

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[CRITICAL REFUND ERROR]', userId, err.message);
    } finally {
      client.release();
    }
  }

  /**
   * TRANSACTION D: Idempotent Expiry Refund
   */
  async refundExpiredSession(sessionId, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT id, status, refunded_at, cost_cents FROM public.sessions WHERE id = $1 FOR UPDATE;`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const session = sessionRes.rows[0];

      if (session.refunded_at !== null || session.status === 'COMPLETED') {
        await client.query('ROLLBACK');
        return false;
      }

      const costCents = parseInt(session.cost_cents, 10);

      await client.query(
        `UPDATE public.sessions SET status = 'EXPIRED', refunded_at = NOW() WHERE id = $1;`,
        [sessionId]
      );

      await client.query(
        `UPDATE public.users SET balance_cents = balance_cents + $1 WHERE id = $2;`,
        [costCents, userId]
      );

      const refundRef = `refund_exp_${sessionId}`;
      await client.query(
        `INSERT INTO public.transactions (user_id, session_id, amount_cents, type, reference, status, notes)
         VALUES ($1, $2, $3, 'REFUND', $4, 'COMPLETED', 'Automatic refund for expired session');`,
        [userId, sessionId, costCents, refundRef]
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