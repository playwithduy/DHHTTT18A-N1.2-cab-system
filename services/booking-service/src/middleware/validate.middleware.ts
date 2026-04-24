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

        // 1. Kiểm tra nếu có bất kỳ trường nào bị THIẾU (undefined)
        const missingField = issues.find(i => (i as any).received === 'undefined');
        if (missingField) {
          return res.status(400).json({
            success: false,
            message: `${missingField.path.join('.')} is required`,
            errors: issues.map(e => ({
              field: e.path.join('.'),
              message: `${e.path.join('.')} is required`
            }))
          });
        }

        // 2. Nếu không thiếu nhưng sai định dạng (ví dụ: truyền string vào number)
        return res.status(422).json({
          success: false,
          message: 'Validation failed: Invalid input format',
          errors: issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  };
