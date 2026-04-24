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

        // 1. Kiểm tra nếu có bất kỳ lỗi nào báo "Required" hoặc thiếu trường
        const isMissing = issues.some(i => 
          i.message === 'Required' || 
          (i as any).received === 'undefined' ||
          i.code === 'invalid_type' && (i as any).received === 'undefined'
        );

        if (isMissing) {
          return res.status(400).json({
            success: false,
            message: `${issues[0].path.join('.')} is required`,
            errors: issues.map(e => ({
              field: e.path.join('.'),
              message: `${e.path.join('.')} is required`
            }))
          });
        }

        // 2. Xử lý riêng cho trường payment_method (Case 14: yêu cầu mã 400)
        const paymentIssue = issues.find(i => i.path[0] === 'payment_method');
        if (paymentIssue) {
          return res.status(400).json({
            success: false,
            message: 'Invalid payment method'
          });
        }

        // 3. Nếu không phải các trường hợp trên thì mới là 422 (Sai định dạng chung)
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
