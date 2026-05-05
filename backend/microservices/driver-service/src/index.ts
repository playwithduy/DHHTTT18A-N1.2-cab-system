// ============================================================
// Driver Service — src/index.ts
// Port: 3004
// ============================================================
import express from 'express';

import helmet from 'helmet';
import { driverRouter } from './routes/driver.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3004;

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());

app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────
app.use('/drivers', driverRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'driver-service' }));

// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => console.log(`[driver-service] Running on port ${PORT}`));

export default app;
