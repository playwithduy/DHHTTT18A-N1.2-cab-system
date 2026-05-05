// ============================================================
// Auth Service — JWT utilities
// ============================================================
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from 'redis';

const JWT_SECRET       = process.env.JWT_SECRET || 'dev-secret-min-32-chars-here!!';
const ACCESS_EXPIRES   = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES  = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const REFRESH_TTL_SEC  = 7 * 24 * 3600; // 7 days in seconds

// ─── Redis client ─────────────────────────────────────────────
export const redisClient: any = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

// ─── Token generation ─────────────────────────────────────────
export function generateAccessToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES as any, algorithm: 'HS256' });
}

export function generateRefreshToken(userId: string): string {
  const token = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES as any,
    algorithm: 'HS256',
  });
  return token;
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  await redisClient.setEx(`refresh:${userId}`, REFRESH_TTL_SEC, token);
}

export async function validateRefreshToken(userId: string, token: string): Promise<boolean> {
  const stored = await redisClient.get(`refresh:${userId}`);
  return stored === token;
}

export async function rotateRefreshToken(userId: string, oldToken: string): Promise<string> {
  // Invalidate old token
  await redisClient.del(`refresh:${userId}`);
  // Generate and store new token
  const newToken = generateRefreshToken(userId);
  await storeRefreshToken(userId, newToken);
  return newToken;
}

export async function blacklistToken(token: string, expiresIn: number): Promise<void> {
  await redisClient.setEx(`blacklist:${token}`, expiresIn, '1');
}

export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
}

// ─── Password utilities ───────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// Auth Controller
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const AuthController = {

  // POST /auth/register
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, phone, role = 'customer' } = req.body;

      // Check duplicate
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, phone, role },
        select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      });

      const accessToken  = generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = generateRefreshToken(user.id);
      await storeRefreshToken(user.id, refreshToken);

      return res.status(201).json({
        success: true,
        data: { user, tokens: { accessToken, refreshToken, expiresIn: 900 } },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const accessToken  = generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = generateRefreshToken(user.id);
      await storeRefreshToken(user.id, refreshToken);

      const { password: _, ...userSafe } = user;

      return res.json({
        success: true,
        data: { user: userSafe, tokens: { accessToken, refreshToken, expiresIn: 900 } },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/refresh
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }

      const decoded = verifyToken(refreshToken) as { userId: string };
      const isValid = await validateRefreshToken(decoded.userId, refreshToken);

      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true },
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const newAccessToken  = generateAccessToken({ userId: user.id, role: user.role });
      const newRefreshToken = await rotateRefreshToken(decoded.userId, refreshToken);

      return res.json({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 900 },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      await redisClient.del(`refresh:${userId}`);
      return res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  // GET /auth/me
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
};
