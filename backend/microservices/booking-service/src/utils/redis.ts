import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({
  url: REDIS_URL
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Performance tracking (TC 66)
export const redisMetrics = {
  hits: 0,
  misses: 0,
  getHitRate: () => {
    const total = redisMetrics.hits + redisMetrics.misses;
    return total === 0 ? 0 : (redisMetrics.hits / total) * 100;
  }
};

const originalGet = redis.get.bind(redis);
redis.get = async (key: string) => {
  const result = await originalGet(key);
  if (result) {
    redisMetrics.hits++;
  } else {
    redisMetrics.misses++;
  }
  return result;
};

// Auto-connect
(async () => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
      console.log('[booking-service] Connected to Redis');
    }
  } catch (err) {
    console.error('[booking-service] Redis connection failed:', err);
  }
})();
