import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({
  url: REDIS_URL
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Auto-connect
(async () => {
  try {
    await redis.connect();
    console.log('[booking-service] Connected to Redis');
  } catch (err) {
    console.error('[booking-service] Redis connection failed:', err);
  }
})();
