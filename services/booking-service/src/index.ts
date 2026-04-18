// ============================================================
// Booking Service — src/index.ts
// Port: 3002
// ============================================================
import express from 'express';
import cors from 'cors';
import { startOutboxWorker } from './workers/outbox.worker';
import helmet from 'helmet';
import { bookingRouter } from './routes/booking.routes';
import morgan from 'morgan';
import { requireGateway } from './middleware/gatewayCheck';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, getMetrics } from './middleware/metrics';

const app = express();
const PORT = process.env.PORT || 3002;

// Step 103 & 109: Fail-Fast Config Validation
const requiredEnv = ['DATABASE_URL', 'KAFKA_BROKERS'];
requiredEnv.forEach(env => {
  if (!process.env[env] && process.env.NODE_ENV === 'production') {
    console.error(`[FATAL] Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(helmet());

// Apply Observability Middlewares (Item 113, 115)
app.use(metricsMiddleware);

// Structured JSON Logging (Item 112)
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'booking-service',
    level: 'INFO',
    trace_id: (req as any).traceId || 'unknown',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    latency: tokens['response-time'](req, res) + ' ms'
  });
}));

app.use(express.json());

// Apply Gateway check to prevent bypass (Item 97)
app.use(requireGateway);

// ─── Routes ──────────────────────────────────────────────────
app.get('/metrics', getMetrics);
app.use('/bookings', bookingRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'booking-service' }));

// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// ─── Kafka Consumer for AI Matching ───────────────────────────
import { Kafka } from 'kafkajs';
import axios from 'axios';

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || '127.0.0.1:9092';
console.log(`[booking-service] Kafka connecting to: ${KAFKA_BROKERS}`);

const kafka = new Kafka({
  clientId: 'booking-service-consumer',
  brokers: KAFKA_BROKERS.split(','),
  retry: { retries: 0 },
});
const consumer = kafka.consumer({ groupId: 'booking-matching-group' });

const startConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: ['driver.assigned'], fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value?.toString() || '{}');
        const { bookingId, driverId } = data;
        console.log(`[booking-service] Driver ${driverId} assigned to ${bookingId}. Updating status...`);
        
        try {
          await axios.patch(`http://127.0.0.1:${PORT}/bookings/${bookingId}/status`, {
            status: 'ACCEPTED',
            driverId
          });
        } catch (err: any) {
          console.error('[booking-service] Failed to update accepted status:', err.message);
        }
      },
    });
  } catch (err: any) {
    console.warn('[booking-service] Consumer Kafka connect skipped (dev/mock mode):', err.message);
  }
};

app.listen(PORT, async () => {
  console.log(`[booking-service] Running on port ${PORT}`);
  await startOutboxWorker();
  startConsumer().catch(err => console.error('[booking-service] Kafka Consumer Error:', err));
});

export default app;
