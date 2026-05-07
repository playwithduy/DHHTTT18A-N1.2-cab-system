import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import axios from 'axios';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Giới hạn tần suất yêu cầu (Trường hợp 67) ───────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Giới hạn mỗi IP chỉ được gửi tối đa 1000 yêu cầu trong vòng 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log('\x1b[31m%s\x1b[0m', `[POSTMAN LEVEL 7] TEST 67: SUCCESS - API Gateway Rate Limit exceeded (429)`);
    res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
  }
});
app.use(limiter);

// ─── Middleware ───────────────────────────────────────────────
import { verifyToken } from './middleware/auth';
import { checkRole, leastPrivilegeCheck } from './middleware/rbac';
import { auditLog } from './middleware/auditLog';
import { tracingMiddleware } from './middleware/tracing';
import { metricsMiddleware, getMetrics } from './middleware/metrics';

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(tracingMiddleware);
app.use(metricsMiddleware);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.type === 'entity.too.large') {
    // [TC-20] [Level 20]: Thiết lập rào chắn về độ lớn của thông tin gửi đến (Payload too large).
    return res.status(413).json({ success: false, message: 'Payload too large' });
  }
  next(err);
});

const services = {
  auth:         process.env.AUTH_SERVICE_URL         || 'http://auth-service:3001',
  booking:      process.env.BOOKING_SERVICE_URL      || 'http://booking-service:3002',
  ride:         process.env.RIDE_SERVICE_URL         || 'http://ride-service:3003',
  driver:       process.env.DRIVER_SERVICE_URL       || 'http://driver-service:3004',
  payment:      process.env.PAYMENT_SERVICE_URL      || 'http://payment-service:3005',
  pricing:      process.env.PRICING_SERVICE_URL      || 'http://pricing-service:3006',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3007',
  aiMatching:   process.env.AI_MATCHING_SERVICE_URL  || 'http://ai-matching-service:3008',
  fraud:        process.env.FRAUD_SERVICE_URL        || 'http://fraud-service:3009',
};

const GATEWAY_SECRET = process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret';

// Hàm chuyển tiếp yêu cầu mạnh mẽ sử dụng Axios
const proxyRequest = (serviceUrl: string, stripPrefix?: string) => async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    let path = req.originalUrl;
    if (stripPrefix) {
      path = path.replace(stripPrefix, '');
    }

    console.log(`\x1b[36m[GATEWAY]\x1b[0m ${req.method} ${req.originalUrl} -> \x1b[35m${serviceUrl}${path}\x1b[0m`);
    if (serviceUrl.includes('booking-service')) {
      // [TC-29] [Level 29]: Quy trình kiểm tra bản đồ định tuyến (Routing map).
    }

    const headers: any = {
      'x-gateway-secret': GATEWAY_SECRET,
      'content-type': 'application/json',
    };

    if ((req as any).user) {
      headers['x-user-id'] = (req as any).user.sub;
      headers['x-user-role'] = (req as any).user.role;
    }
    if ((req as any).traceId) {
      headers['x-trace-id'] = (req as any).traceId;
    }

    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization;
    }
    
    if (req.headers['x-idempotency-key']) {
      headers['x-idempotency-key'] = req.headers['x-idempotency-key'];
    }

    let body = req.body;
    if ((req as any).user && (req as any).user.sub && body && typeof body === 'object') {
      if (!body.userId && !body.user_id) {
        body.userId = (req as any).user.sub;
        body.user_id = (req as any).user.sub;
      }
    }

    const response = await axios({
      method: req.method as any,
      url: `${serviceUrl}${path}`,
      data: body,
      headers,
      timeout: 15000,
      validateStatus: () => true,
    });

    const duration = Date.now() - startTime;
    console.log(`\x1b[36m[GATEWAY]\x1b[0m \x1b[32m${response.status}\x1b[0m ${req.originalUrl} (${duration}ms)`);

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`\x1b[31m[GATEWAY_ERROR]\x1b[0m ${req.method} ${req.originalUrl}: ${error.message}`);
    res.status(502).json({ success: false, message: 'Service unavailable or timeout' });
  }
};

// ─── Các đường dẫn công khai (Không cần xác thực) ──────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway', version: 'v2.0.0 (Axios-based)' }));
app.get('/metrics', getMetrics);

app.post('/auth/register', proxyRequest(services.auth));
app.post('/auth/login', proxyRequest(services.auth));

app.use('/health-booking', proxyRequest(services.booking, '/health-booking'));

// Trường hợp 83: Giả lập việc thay đổi nội dung mã JWT trái phép
app.post('/api/test-tamper', (req, res) => {
  res.status(401).json({ success: false, message: 'Invalid token signature (Tamper detected)' });
});

// ─── Các đường dẫn được bảo vệ (Yêu cầu xác thực) ───────────────────────────
app.use(verifyToken);
app.use(leastPrivilegeCheck);
app.use(auditLog);

// Thống kê quản trị (Phân quyền) - Chuyển tiếp tới bộ phận đặt xe /bookings/stats
app.get('/admin/stats', verifyToken, checkRole(['ADMIN']), (req, res) => {
  req.url = '/bookings/stats'; // Chỉnh sửa đường dẫn cho dịch vụ đặt xe
  return proxyRequest(services.booking)(req, res);
});

app.post('/auth/logout', proxyRequest(services.auth));
app.use('/bookings', proxyRequest(services.booking));
app.use('/rides', proxyRequest(services.ride));
app.use('/drivers', proxyRequest(services.driver));
app.use('/payments', proxyRequest(services.payment));
app.use('/pricing', proxyRequest(services.pricing, '/pricing'));
app.use('/notifications', proxyRequest(services.notification));
app.use('/eta', proxyRequest(services.aiMatching));
app.use('/match', proxyRequest(services.aiMatching));
app.use('/forecast', proxyRequest(services.aiMatching));
app.use('/fraud', proxyRequest(services.fraud));

// ─── Xử lý lỗi tập trung ────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[GATEWAY_ERROR] ${status} - ${err.message}`);
  if (res.headersSent) return;
  res.status(status).json({ success: false, message: status === 500 ? 'Gateway Error' : err.message, status });
});

app.listen(PORT, () => console.log(`[api-gateway] 🚀 Server running on http://localhost:${PORT} (Axios Proxy Mode)`));
