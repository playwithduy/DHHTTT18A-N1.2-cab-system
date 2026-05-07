import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Định nghĩa các cấu trúc dữ liệu (Schema)
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

// Hàm tạo Middleware kiểm tra dữ liệu
export const validate = (schema: z.ZodObject<any, any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        console.log('🔍 Chi tiết lỗi kiểm tra dữ liệu:', JSON.stringify(issues));

        // Kiểm tra trực tiếp req.body ---
        if (!req.body.pickup || !req.body.drop) {
          const missingField = !req.body.pickup ? 'pickup' : 'drop';
          // Level 11: Rà soát toàn bộ các thông tin cần thiết trong yêu cầu của người dùng, đảm bảo không có trường dữ liệu nào bị bỏ trống trước khi xử lý.
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
          // Level 11: Rà soát toàn bộ các thông tin cần thiết trong yêu cầu của người dùng, đảm bảo không có trường dữ liệu nào bị bỏ trống trước khi xử lý.
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
          // Level 14: Xác minh sự hợp lệ của phương thức thanh toán được người dùng lựa chọn, đảm bảo tính tương thích với các quy định của hệ thống tài chính.
          return res.status(400).json({
            success: false,
            message: 'Invalid payment method'
          });
        }

        // TC12: Sai định dạng tọa độ lat/lng (Yêu cầu HTTP 422)
        // Level 12: Kiểm định tính chính xác của dữ liệu tọa độ địa lý, đảm bảo vị trí đi và đến nằm trong phạm vi xử lý hợp lệ của bản đồ.
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
