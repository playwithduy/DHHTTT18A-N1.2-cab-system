import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

import { createClient } from 'redis';
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'cabgo_secret_32_characters_long_system_test';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });
redis.connect().catch(err => console.error('[auth-service] Redis connection failed', err));

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role } = req.body || {};

    if (role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot register as ADMIN' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email hoặc số điện thoại đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createData: any = {
      email,
      password: hashedPassword,
      name,
      role: role || 'CUSTOMER',
    };

    if (phone) {
      createData.phone = phone;
    }

    const user = await prisma.user.create({
      data: createData
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // --- NHẮC BÀI: Chỗ này trả về 201 Created cho TC1 (Đăng ký thành công) ---
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user_id: user.id,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        access_token: token
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // --- NHẮC BÀI: Chỗ này trả về 200 OK và JWT Token cho TC2 (Đăng nhập) ---
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        access_token: token
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Decode without verification to get expiry
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.set(`blacklist:${token}`, 'true', { EX: ttl });
        }
      }
    }
    
    res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
