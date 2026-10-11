// src/services/catalog.service.js
const db = require('../config/db');

class CatalogService {
  /**
   * Fetch full inventory with dynamic pricing for a given service
   */
  async getCatalogByService(serviceId) {
    const query = `
      SELECT
        c.code AS country_code,
        c.name AS country_name,
        c.flag_emoji,
        p.price_cents,
        p.stock_count,
        p.success_rate,
        p.is_available
      FROM public.pricing p
      JOIN public.countries c ON p.country_code = c.code
      WHERE p.service_id = $1
        AND c.is_active = TRUE
        AND p.is_available = TRUE
      ORDER BY p.price_cents ASC;
    `;
    const { rows } = await db.query(query, [serviceId.toLowerCase()]);
    return rows;
  }

  /**
   * Fetch price in USD cents for a specific country + service combo
   * Returns null if unavailable / out of stock
   */
  async getPriceForService(countryCode, serviceId) {
    const query = `
      SELECT price_cents, is_available, stock_count
      FROM public.pricing
      WHERE country_code = $1 AND service_id = $2;
    `;
    const { rows } = await db.query(query, [
      countryCode.toUpperCase(),
      serviceId.toLowerCase()
    ]);

    if (rows.length === 0 || !rows[0].is_available || rows[0].stock_count <= 0) {
      return null;
    }

    return parseInt(rows[0].price_cents, 10);
  }
}

module.exports = new CatalogService();