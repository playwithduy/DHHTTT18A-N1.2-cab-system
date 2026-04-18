import { Request, Response, NextFunction } from 'express';

const INTERNAL_SECRET = process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret';

export const requireGateway = (req: Request, res: Response, next: NextFunction) => {
  // Allow health checks and metrics
  if (req.path === '/health' || req.path === '/metrics') return next();

  const secret = req.headers['x-gateway-secret'];
  
  if (secret !== INTERNAL_SECRET) {
    console.warn(`[SECURITY] Gateway bypass attempt detected from IP: ${req.ip}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Direct access to microservice is forbidden. Please route through API Gateway.' 
    });
  }

  next();
};
