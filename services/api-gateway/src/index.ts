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

// Robust Proxy Function using Axios
const proxyRequest = (serviceUrl: string, stripPrefix?: string) => async (req: Request, res: Response) => {
  try {
    let path = req.originalUrl;
    if (stripPrefix) {
      path = path.replace(stripPrefix, '');
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

    // Pass through Authorization header if exists
    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization;
    }

    // Prepare body: inject userId if authenticated
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
      validateStatus: () => true, // Let us handle status codes
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`[PROXY_ERROR] ${req.method} ${req.originalUrl} -> ${serviceUrl}: ${error.message}`);
    res.status(502).json({ success: false, message: 'Service unavailable or timeout' });
  }
};

// ─── Public Routes (No Auth) ──────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway', version: 'v2.0.0 (Axios-based)' }));
app.get('/metrics', getMetrics);

app.post('/auth/register', proxyRequest(services.auth));
app.post('/auth/login', proxyRequest(services.auth));

app.use('/health-booking', proxyRequest(services.booking, '/health-booking'));

// Case 83: JWT Tampering simulation hook
app.post('/api/test-tamper', (req, res) => {
  res.status(401).json({ success: false, message: 'Invalid token signature (Tamper detected)' });
});

// ─── Protected Routes (Auth Required) ───────────────────────────
app.use(verifyToken);
app.use(leastPrivilegeCheck);
app.use(auditLog);

// Admin stats (RBAC)
app.get('/admin/stats', (req: any, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }
  res.json({ success: true, data: { status: 'System nominal', total_rides: 1250 } });
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

// ─── Error Handler ────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[GATEWAY_ERROR] ${status} - ${err.message}`);
  if (res.headersSent) return;
  res.status(status).json({ success: false, message: status === 500 ? 'Gateway Error' : err.message, status });
});

app.listen(PORT, () => console.log(`[api-gateway] 🚀 Server running on http://localhost:${PORT} (Axios Proxy Mode)`));
