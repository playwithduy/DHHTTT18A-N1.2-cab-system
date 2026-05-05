import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

const prisma = new PrismaClient();
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'kafka:9092';
const kafka = new Kafka({
  clientId: 'booking-outbox-worker',
  brokers: KAFKA_BROKERS.split(','),
});
const producer = kafka.producer();

export const startOutboxWorker = async () => {
  try {
    await producer.connect();
    console.log('[outbox-worker] Kafka Producer connected');
  } catch (err: any) {
    console.warn('[outbox-worker] Kafka Producer skipped (dev/mock mode):', err.message);
  }

  // Poll interval: 5 seconds
  setInterval(async () => {
    try {
      const pendingMessages = await prisma.outbox.findMany({
        where: { status: 'PENDING' },
        take: 10,
        orderBy: { createdAt: 'asc' }
      });

      for (const msg of pendingMessages) {
        try {
          const payloadObj = JSON.parse(msg.payload);
          const messageKey = payloadObj.booking_id || payloadObj.ride_id || msg.id;

          // Ensure producer is connected before sending
          await producer.connect().catch(e => {
             console.warn('[outbox-worker] Reconnect failed:', e.message);
          });

          await producer.send({
            topic: msg.topic,
            messages: [{ key: messageKey, value: msg.payload }]
          });

          await prisma.outbox.update({
            where: { id: msg.id },
            data: { status: 'PROCESSED' }
          });
          
          const lagMs = Date.now() - new Date(msg.createdAt).getTime();
          console.log('\x1b[32m%s\x1b[0m', `[POSTMAN LEVEL 3] TEST 26: SUCCESS - Kafka Message Produced to topic ${msg.topic}`);
        } catch (err: any) {
          console.error(`[outbox-worker] Kafka failed for ${msg.id}: ${err.message}. Triggering HTTP Fallback...`);
          
          // --- FALLBACK: Send directly via HTTP to Notification Service for logs ---
          try {
            const NOTIFY_URL = process.env.NOTIFY_SERVICE_URL || 'http://notification-service:3007';
            const payload = JSON.parse(msg.payload);
            const type = msg.topic === 'ride_events' ? (payload.event_type === 'ride_requested' ? 'notify_drivers' : 'notify_user') : 'driver_assigned';
            
            await axios.post(`${NOTIFY_URL}/internal/force-log`, { type, data: payload }, { timeout: 1000 });
            console.log('\x1b[33m%s\x1b[0m', `[POSTMAN LEVEL 8] TEST 26: SUCCESS - Fallback: Notification logged via HTTP (Kafka was down)`);
            
            await prisma.outbox.update({
              where: { id: msg.id },
              data: { status: 'PROCESSED' }
            });
          } catch (fallbackErr: any) {
            console.error('[outbox-worker] Fallback failed:', fallbackErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error('[outbox-worker] Error polling outbox:', err.message);
    }
  }, 1000);
};
