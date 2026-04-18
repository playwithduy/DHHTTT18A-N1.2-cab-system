// ============================================================
// Auth Service — src/index.ts
// Port: 3001
// ============================================================
import express from 'express';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(express.json());

// Rate limiting: 10 requests/min per IP on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/auth', authLimiter);

// ─── Routes ──────────────────────────────────────────────────
// Step 97: Zero Trust Isolation
const GATEWAY_SECRET = process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret';
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
    return res.status(403).json({ success: false, message: 'Zero Trust: Direct access forbidden' });
  }
  next();
});

app.use('/auth', authRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => console.log(`[auth-service] Running on port ${PORT}`));
export default app;
