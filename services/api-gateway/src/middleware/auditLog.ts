import { Request, Response, NextFunction } from 'express';
import { DecodedToken } from './auth';

export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const user = (req as any).user as DecodedToken;
    const duration = Date.now() - start;
    
    // Construct Security Trace
    const trace = {
      timestamp: new Date().toISOString(),
      user_id: user?.userId || 'anonymous',
      role: user?.role || 'NONE',
      action: `[${req.method}] ${req.originalUrl}`,
      ip: req.ip || req.socket.remoteAddress,
      status: res.statusCode,
      latencyMs: duration
    };

    console.log(`[AUDIT_LOG] ${JSON.stringify(trace)}`);
  });

  next();
};
