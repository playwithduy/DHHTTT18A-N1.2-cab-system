import { Request, Response, NextFunction } from 'express';
import { DecodedToken } from './auth';

export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as DecodedToken;
    if (!user) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    next();
  };
};

export const leastPrivilegeCheck = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as DecodedToken;
  if (!user) return next();

  // If a driver or user fetches /users/:id, the ID must belong to them (unless they are ADMIN)
  if (req.path.startsWith('/users/')) {
    const targetId = req.path.split('/')[2];
    if (user.role !== 'ADMIN' && targetId && targetId !== (user as any).sub) {
      return res.status(403).json({ success: false, message: 'Access denied: least privilege violated' });
    }
  }

  next();
};
