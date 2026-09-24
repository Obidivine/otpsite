require('dotenv').config();
const { Redis } = require('@upstash/redis');

// The SDK automatically reads the UPSTASH_REDIS_REST_URL and TOKEN from the environment
const redis = Redis.fromEnv();

(async () => {
  try {
    await redis.set('test_key', 'hello_phase2');
    const value = await redis.get('test_key');
    console.log('✅ Redis works:', value);
    await redis.del('test_key');
  } catch (err) {
    console.error('❌ Redis failed:', err.message);
  }
})();