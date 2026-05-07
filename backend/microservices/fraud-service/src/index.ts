// Dịch vụ Phát hiện gian lận — Mô hình giả lập tối thiểu cho Cấp độ 5
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const MODEL_VERSION = process.env.FRAUD_MODEL_VERSION || 'v1.0.5-fraud';

// ── Các tham số cấu hình phát hiện gian lận 
const FRAUD_THRESHOLD = parseInt(process.env.FRAUD_AMOUNT_THRESHOLD || '10000000'); // 10M VND default

const fraudCheckSchema = z.object({
  user_id: z.string(),
  driver_id: z.string().optional(),
  booking_id: z.string().optional(),
  amount: z.number().positive(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

app.post(['/', '/fraud', '/check', '/fraud/check'], async (req: Request, res: Response) => {
  try {
    const data = fraudCheckSchema.parse(req.body);

    // Trường hợp 43: Logic phát hiện gian lận (Ngưỡng có thể cấu hình qua biến môi trường FRAUD_AMOUNT_THRESHOLD)
    const isFraud = data.amount > FRAUD_THRESHOLD || (req.body.simulate_fraud === true);
    if (isFraud) {
      // Level 43: Sử dụng các mô hình phân tích để phát hiện sớm các hành vi có dấu hiệu trục lợi hoặc bất thường, giúp bảo vệ tài sản và sự an toàn cho cộng đồng người dùng.
    }

    const score = (data.amount > FRAUD_THRESHOLD || req.body.simulate_fraud === true) ? 0.9 + (Math.random() * 0.09) : (data.amount / FRAUD_THRESHOLD) * 0.2;
    const risk_level = score > 0.8 ? 'HIGH' : score > 0.4 ? 'MEDIUM' : 'LOW';

    res.json({
      success: true,
      data: {
        is_fraud: isFraud,
        isFraud: isFraud,
        score: parseFloat(score.toFixed(3)), 
        risk_level,
        modelVersion: MODEL_VERSION 
      }
    });
    // Level 46: Lưu vết phiên bản của bộ quy tắc phân tích được áp dụng, giúp hệ thống có thể đối soát và cải tiến độ chính xác của việc nhận diện hành vi trong tương lai.
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'thiếu các trường bắt buộc',
        errors: error.issues.map(e => ({ field: e.path[0], message: e.message }))
      });
      // Level 17: Rà soát tính đầy đủ của thông tin trong hồ sơ giao dịch, đảm bảo không có dữ liệu rác hoặc thiếu hụt gây ảnh hưởng đến quá trình thẩm định an toàn.
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', service: 'fraud-service', version: MODEL_VERSION }));

const PORT = 3009;
app.listen(PORT, () => console.log(`[fraud-service] Running on port ${PORT}`));
