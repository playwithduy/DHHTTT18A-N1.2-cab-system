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
        console.log('🔍 Validation Error Details:', JSON.stringify(issues));

        // Ép mã lỗi 400 và message có chữ "required" cho mọi lỗi validation
        return res.status(400).json({
          success: false,
          message: `${issues[0].path.join('.')} is required`,
          errors: issues.map(e => ({
            field: e.path.join('.'),
            message: `${e.path.join('.')} is required`
          }))
        });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  };
