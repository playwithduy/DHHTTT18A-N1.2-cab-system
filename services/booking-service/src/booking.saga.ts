// ============================================================
// Booking Service — Saga Orchestration
// ============================================================
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Kafka setup ──────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','),
  retry: { retries: 0 },
});

const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: 'booking-service-group' });

// ─── Topic names ──────────────────────────────────────────────
const TOPICS = {
  RIDE_CREATED:         'ride.created',
  DRIVER_ASSIGNED:      'driver.assigned',
  DRIVER_NOT_FOUND:     'driver.not_found',
  BOOKING_CONFIRMED:    'booking.confirmed',
  BOOKING_FAILED:       'booking.failed',
  RIDE_COMPLETED:       'ride.completed',
  PAYMENT_COMPLETED:    'payment.completed',
  PAYMENT_FAILED:       'payment.failed',
} as const;

// ─── Booking Saga Orchestrator ────────────────────────────────
export class BookingSagaOrchestrator {
  async start() {
    console.log('[booking-service] Saga orchestrator running (Kafka Disabled for Test)...');
    /*
    try {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({
        topics: [TOPICS.DRIVER_ASSIGNED, TOPICS.DRIVER_NOT_FOUND, TOPICS.PAYMENT_COMPLETED, TOPICS.PAYMENT_FAILED],
        fromBeginning: false,
      });
      await consumer.run({ eachMessage: this.handleMessage.bind(this) });
      console.log('[booking-service] Saga orchestrator running...');
    } catch (err: any) {
      console.warn('[booking-service] Kafka connect skipped (dev/mock mode):', err.message);
    }
    */
  }

  private async handleMessage({ topic, message }: EachMessagePayload) {
    const data = JSON.parse(message.value?.toString() || '{}');

    switch (topic) {
      case TOPICS.DRIVER_ASSIGNED:
        await this.onDriverAssigned(data);
        break;
      case TOPICS.DRIVER_NOT_FOUND:
        await this.onDriverNotFound(data);
        break;
      case TOPICS.PAYMENT_COMPLETED:
        await this.onPaymentCompleted(data);
        break;
      case TOPICS.PAYMENT_FAILED:
        await this.onPaymentFailed(data);
        break;
    }
  }

  // Step 1: Customer creates booking → publish RideCreated
  async createBooking(data: {
    customerId: string;
    pickup: { lat: number; lng: number; address: string };
    dropoff: { lat: number; lng: number; address: string };
    vehicleType: string;
    estimatedFare: number;
    idempotencyKey?: string;
  }) {
    // 1. Idempotency Check (Case 34)
    if (data.idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { idempotencyKey: data.idempotencyKey }
      });
      if (existing) {
        console.log(`[saga] Idempotency hit for key ${data.idempotencyKey}`);
        return existing;
      }
    }

    // 2. Atomic Transaction (Case 31, 38)
    return await prisma.$transaction(async (tx) => {
      // 2.0 Concurrency Check (Case 35)
      const activeBooking = await tx.booking.findFirst({
        where: {
          userId: data.customerId,
          status: { in: ['SEARCHING', 'DRIVER_ASSIGNED'] }
        }
      });
      if (activeBooking) {
        throw new Error('You already have an active booking request');
      }

      // 2.1 Create Booking
      const booking = await tx.booking.create({
        data: {
          userId:        data.customerId,
          pickupLat:     data.pickup.lat,
          pickupLng:     data.pickup.lng,
          pickupAddress: data.pickup.address,
          dropLat:       data.dropoff.lat,
          dropLng:       data.dropoff.lng,
          dropoffAddress: data.dropoff.address,
          vehicleType:   data.vehicleType,
          price:         data.estimatedFare,
          status:        'SEARCHING',
          idempotencyKey: data.idempotencyKey,
          distanceKm:    5, // Mock distance if not provided
        },
      });

      // 2.2 Create Outbox Entry (Guarantees Kafka event is sent only if DB commit success)
      await tx.outbox.create({
        data: {
          topic: TOPICS.RIDE_CREATED,
          payload: JSON.stringify({
            bookingId:   booking.id,
            customerId:  booking.userId,
            pickup:      data.pickup,
            vehicleType: data.vehicleType,
            timestamp:   new Date().toISOString(),
          }),
        },
      });

      return booking;
    });
  }

  // Step 2: Driver Service found a driver
  private async onDriverAssigned(data: { bookingId: string; driverId: string; eta: number }) {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { driverId: data.driverId, status: 'DRIVER_ASSIGNED', driverEta: data.eta },
    });

    await producer.send({
      topic: TOPICS.BOOKING_CONFIRMED,
      messages: [{
        key: data.bookingId,
        value: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
      }],
    });

    console.log(`[saga] Booking ${data.bookingId} confirmed with driver ${data.driverId}`);
  }

  // Step 2 (failure): No driver found → compensate
  private async onDriverNotFound(data: { bookingId: string; reason: string }) {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { status: 'FAILED', failureReason: 'NO_DRIVER_AVAILABLE' },
    });

    await producer.send({
      topic: TOPICS.BOOKING_FAILED,
      messages: [{
        key: data.bookingId,
        value: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
      }],
    });

    console.log(`[saga] Booking ${data.bookingId} failed: ${data.reason}`);
  }

  // Step 3: Payment completed
  private async onPaymentCompleted(data: { bookingId: string; amount: number }) {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
    console.log(`[saga] Booking ${data.bookingId} payment completed: ${data.amount}`);
  }

  // Step 3 (failure): Payment failed
  private async onPaymentFailed(data: { bookingId: string; reason: string }) {
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { status: 'PAYMENT_FAILED' },
    });
    console.log(`[saga] Booking ${data.bookingId} payment failed`);
  }

  async stop() {
    await consumer.disconnect();
    await producer.disconnect();
  }
}

// ─── Booking Controller ───────────────────────────────────────
import { Request, Response, NextFunction } from 'express';

const saga = new BookingSagaOrchestrator();
saga.start();

export const BookingController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { pickup, dropoff, vehicleType, estimatedFare } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;
      const customerId = (req as any).user?.userId || '6613f8e5f22e8a1d4c8e9b01'; // Fallback for test

      const booking = await saga.createBooking({
        customerId, pickup, dropoff, vehicleType, estimatedFare, idempotencyKey
      });

      return res.status(201).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
      });
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

      if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
      }

      const updated = await prisma.booking.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      return res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
};
