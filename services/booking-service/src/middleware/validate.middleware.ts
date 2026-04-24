import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schema definitions
export const createBookingSchema = z.object({
  pickup: z.object({
    lat: z.number({ error: "Coordinates must be numbers" }).min(-90).max(90),
    lng: z.number({ error: "Coordinates must be numbers" }).min(-180).max(180),
  }),
  drop: z.object({
    lat: z.number({ error: "Coordinates must be numbers" }).min(-90).max(90),
    lng: z.number({ error: "Coordinates must be numbers" }).min(-180).max(180),
  }),
  distance_km: z.number().min(0, "Distance cannot be negative").optional().default(5),
  payment_method: z.enum(['CASH', 'WALLET', 'CARD', 'VNPAY', 'MOMO', 'STRIPE', 'PAYPAL'], { 
    error: "Invalid payment method"
  }).optional().default('CASH'), // Case 14
});

// Middleware factory
export const validate = (schema: z.ZodObject<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        
        const pickupIssue = issues.find(i => i.path[0] === 'pickup' || (i.path[0] === 'pickup' && i.code === 'invalid_type'));
        if (pickupIssue && (pickupIssue.code === 'invalid_type' && (pickupIssue as any).received === 'undefined')) {
          return res.status(400).json({ success: false, message: 'pickup is required' });
        }

        const isMissingField = issues.some(e => e.code === 'invalid_type' && (e as any).received === 'undefined');
        const isInvalidFormat = issues.some(e => e.code === 'invalid_type' && (e as any).received !== 'undefined');
        
        let status = 400;
        if (isInvalidFormat) status = 422; // Case 12

        // Case 14: specific message for payment method
        const paymentIssue = issues.find(i => i.path[0] === 'payment_method');
        if (paymentIssue) {
          return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }

        return res.status(status).json({
          success: false,
          message: issues[0].message || 'Validation failed',
          errors: issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  };
