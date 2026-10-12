// src/middleware/ratelimit.middleware.js
const { Redis } = require('@upstash/redis');
const { Ratelimit } = require('@upstash/ratelimit');

// Initialize Upstash Redis via REST API
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Auth limiter: 5 requests per 10 seconds per IP + email
const authRateLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: false,
  prefix: 'ratelimit:auth',
});

// Rent limiter: 5 requests per 60 seconds per user ID
const rentRateLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: false,
  prefix: 'ratelimit:rent',
});

function enforceRateLimit(limiterInstance, identifierKeyExtractor) {
  return async (req, res, next) => {
    try {
      const identifier = identifierKeyExtractor(req);
      const { success, limit, remaining, reset } = await limiterInstance.limit(identifier);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset);

      if (!success) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      next();
    } catch (err) {
      console.error('[RATE LIMIT ERROR]:', err.message);
      next();
    }
  };
}

module.exports = {
  authLimiter: enforceRateLimit(authRateLimiter, (req) => `${req.ip}_${(req.body.email || 'anonymous').toLowerCase()}`),
  rentLimiter: enforceRateLimit(rentRateLimiter, (req) => req.user ? req.user.id : req.ip),
};