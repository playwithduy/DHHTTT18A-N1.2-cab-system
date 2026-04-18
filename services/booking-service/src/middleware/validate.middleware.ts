import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schema definitions
export const createBookingSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  drop: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  distance_km: z.number().min(0, "Distance cannot be negative"),
  payment_method: z.enum(['CASH', 'CARD', 'WALLET']).default('CASH'), // Case 14
});

// Middleware factory
export const validate = (schema: z.ZodObject<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      const issues = error.issues || (error && error.errors) || [];
      const isMissingField = issues.some((e: any) => 
        e.code === 'invalid_type' && 
        (e.received === 'undefined' || (e.message && e.message.includes('received undefined')))
      );
      const status = isMissingField ? 400 : 422;

      return res.status(status).json({
        success: false,
        message: status === 400 ? 'missing required fields' : 'Validation failed',
        errors: issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      console.error('[booking-service] Validation internal error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };
