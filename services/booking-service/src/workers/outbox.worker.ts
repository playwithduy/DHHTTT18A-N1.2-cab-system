import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

const prisma = new PrismaClient();
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || '127.0.0.1:9092';
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

          await producer.send({
            topic: msg.topic,
            messages: [{ key: messageKey, value: msg.payload }]
          });

          await prisma.outbox.update({
            where: { id: msg.id },
            data: { status: 'PROCESSED' }
          });
          
          const lagMs = Date.now() - new Date(msg.createdAt).getTime();
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            service_name: 'booking-outbox-worker',
            level: 'INFO',
            type: 'KAFKA_LAG',
            message: `Processed message ${msg.id} for topic ${msg.topic}`,
            lag_ms: lagMs
          }));
        } catch (err: any) {
          console.error(`[outbox-worker] Failed to process message ${msg.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('[outbox-worker] Error polling outbox:', err.message);
    }
  }, 1000);
};
