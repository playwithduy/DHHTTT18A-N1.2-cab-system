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

        // Kiểm tra trực tiếp req.body ---
        if (!req.body.pickup || !req.body.drop) {
          const missingField = !req.body.pickup ? 'pickup' : 'drop';
          console.log('\x1b[31m%s\x1b[0m', `[POSTMAN LEVEL 2] TEST 11: SUCCESS - Missing field '${missingField}' validation caught (400)`);
          return res.status(400).json({
            success: false,
            message: `${missingField} is required`,
            errors: [{ field: missingField, message: `${missingField} is required` }]
          });
        }

        // TC11: Các trường hợp thiếu khác (dựa vào Zod)
        const isMissing = issues.some(i =>
          i.message === 'Required' ||
          i.message.toLowerCase().includes('required') ||
          (i as any).received === 'undefined'
        );

        if (isMissing) {
          console.log('\x1b[31m%s\x1b[0m', `[POSTMAN LEVEL 2] TEST 11: SUCCESS - Required field '${issues[0].path.join('.')}' validation caught (400)`);
          return res.status(400).json({
            success: false,
            message: `${issues[0].path.join('.')} is required`,
            errors: issues.map(e => ({
              field: e.path.join('.'),
              message: `${e.path.join('.')} is required`
            }))
          });
        }

        // TC14: Sai phương thức thanh toán (Yêu cầu HTTP 400)
        const paymentIssue = issues.find(i => i.path[0] === 'payment_method');
        if (paymentIssue) {
          console.log('\x1b[31m%s\x1b[0m', `[POSTMAN LEVEL 2] TEST 14: SUCCESS - Invalid payment method caught (400)`);
          return res.status(400).json({
            success: false,
            message: 'Invalid payment method'
          });
        }

        // TC12: Sai định dạng tọa độ lat/lng (Yêu cầu HTTP 422)
        console.log('\x1b[31m%s\x1b[0m', `[POSTMAN LEVEL 2] TEST 12: SUCCESS - Invalid coordinate format caught (422)`);
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
