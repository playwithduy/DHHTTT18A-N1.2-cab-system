import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { createClient } from 'redis';

const JWT_SECRET = process.env.JWT_SECRET || 'cabgo_secret_32_characters_long_system_test';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });

redis.connect().catch(err => console.error('[api-gateway] Redis connection failed', err));

export interface DecodedToken {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  // Allow public routes
  if (req.path.startsWith('/auth/register') || req.path.startsWith('/auth/login') || req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Blacklist check (Case 10)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been invalidated (logged out)' });
    }

    // Attach decoded token to request for downstream middlewares (RBAC/Logs)
    (req as any).user = {
      sub: decoded.userId || decoded.sub,
      role: decoded.role || 'CUSTOMER'
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
