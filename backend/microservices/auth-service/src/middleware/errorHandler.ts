import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Hệ thống đang gặp sự cố, vui lòng thử lại sau.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
