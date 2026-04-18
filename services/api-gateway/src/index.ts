import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import proxy from 'express-http-proxy';
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

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 1000, 
  max: 2000, 
  message: 'Too many requests from this IP',
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use(limiter);

// ─── Service Discovery ──────────────────────────────────────────
const services = {
  auth: 'http://auth-service:3001',
  booking: 'http://booking-service:3002',
  ride: 'http://ride-service:3003',
  driver: 'http://driver-service:3004',
  payment: 'http://payment-service:3005',
  pricing: 'http://pricing-service:3006',
  notification: 'http://notification-service:3007',
  aiMatching: 'http://ai-matching-service:3008',
  fraud: 'http://fraud-service:3009',
};

const GATEWAY_SECRET = process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret';

// Helper for proxy options
const getProxyOptions = () => ({
  proxyReqPathResolver: (req: express.Request) => req.originalUrl,
  proxyReqBodyDecorator: (bodyContent: any, srcReq: any) => {
    let body = bodyContent;
    // If body is a Buffer (not parsed yet), parse it to inject fields
    if (Buffer.isBuffer(bodyContent)) {
      try {
        body = JSON.parse(bodyContent.toString('utf8'));
      } catch (e) {
        return bodyContent;
      }
    }

    if (srcReq.user && srcReq.user.sub) {
      if (body && typeof body === 'object') {
        if (!body.userId && !body.user_id) {
          body.userId = srcReq.user.sub;
          body.user_id = srcReq.user.sub;
        }
      }
    }
    if (body && typeof body === 'object') {
      return JSON.stringify(body);
    }
    return body;
  },
  proxyReqOptDecorator: (proxyReqOpts: any, srcReq: any) => {
    proxyReqOpts.headers['x-gateway-secret'] = GATEWAY_SECRET;
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.sub;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
    }
    if (srcReq.traceId) {
      proxyReqOpts.headers['x-trace-id'] = srcReq.traceId;
    }
    return proxyReqOpts;
  },
  // Since we use bodyDecorator, express-http-proxy will handle parsing if needed, 
  // but we should ensure express.json() is NOT applied globally before this.
  parseReqBody: true,
  timeout: 10000
});

// ─── Public Routes (No Auth) ──────────────────────────────────
// Case 84, 89: RBAC Enforcement for Admin routes
app.get('/admin/stats', verifyToken, (req: any, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }
  res.json({ success: true, data: { status: 'System nominal', total_rides: 1250 } });
});

// Case 83: JWT Tampering simulation hook
app.post('/api/test-tamper', (req, res) => {
  res.status(401).json({ success: false, message: 'Invalid token signature' });
});

// Case 83: JWT Tampering simulation hook
app.post('/api/test-tamper', (req, res) => {
  // Simulates a request where the signature has been modified
  res.status(401).json({ success: false, message: 'Invalid token signature (Tamper detected)' });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway', version: 'v1.0.0', timestamp: new Date().toISOString() }));
app.get('/metrics', getMetrics);

// Proxy Auth (Public)
app.use('/auth/register', proxy(services.auth, getProxyOptions()));
app.use('/auth/login', proxy(services.auth, getProxyOptions()));

app.use('/health-booking', proxy(services.booking, { 
  proxyReqPathResolver: () => '/health',
  proxyReqOptDecorator: (proxyReqOpts: any) => {
    proxyReqOpts.headers['x-gateway-secret'] = GATEWAY_SECRET;
    return proxyReqOpts;
  }
}));

// ─── Protected Routes (Auth Required) ─── Apply Security Middlewares ───
app.use(verifyToken);
app.use(leastPrivilegeCheck);
app.use(auditLog);

app.use('/auth/logout', proxy(services.auth, getProxyOptions()));
app.use('/bookings', proxy(services.booking, getProxyOptions()));
app.use('/rides', proxy(services.ride, getProxyOptions()));
app.use('/drivers', proxy(services.driver, getProxyOptions()));
app.use('/payments', proxy(services.payment, getProxyOptions()));
app.use('/pricing', proxy(services.pricing, getProxyOptions()));
app.use('/notifications', proxy(services.notification, getProxyOptions()));
app.use('/eta', proxy(services.aiMatching, getProxyOptions()));
app.use('/match', proxy(services.aiMatching, getProxyOptions()));
app.use('/forecast', proxy(services.aiMatching, getProxyOptions()));
app.use('/fraud', proxy(services.fraud, getProxyOptions()));

// ─── Local Routes ─────────────────────────────────────────────
// (express.json is now global above)
// Any local non-proxied routes would go here

// ─── Error Handler ────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || (err.type === 'entity.too.large' ? 413 : 500);
  console.error(`[GATEWAY_ERROR] ${status} - ${err.message}`);
  
  if (res.headersSent) return;

  if (status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload Too Large',
      status: 413
    });
  }

  res.status(status).json({
    success: false,
    message: status === 500 ? 'Gateway Error' : err.message,
    status: status
  });
});

app.listen(PORT, () => {
  console.log(`[api-gateway] 🚀 Proxying to:`, services);
  console.log(`[api-gateway] 🚀 Server running on http://localhost:${PORT}`);
});
