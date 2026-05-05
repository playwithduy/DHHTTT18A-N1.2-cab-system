import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect().catch(console.error);

export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-idempotency-key'];

  if (!key) return next();

  try {
    const cached = await redis.get(`idempotency:${key}`);
    if (cached) {
      // Test 19: Return old result
      console.log(`[idempotency] Duplicate request detected for key: ${key}`);
      return res.status(200).json(JSON.parse(cached));
    }

    // Wrap res.json to cache the response
    const originalJson = res.json;
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.setEx(`idempotency:${key}`, 86400, JSON.stringify(body));
      }
      return originalJson.call(res, body);
    };

    return next();
  } catch (error) {
    console.error('[idempotency] Redis error:', error);
    return next();
  }
};
