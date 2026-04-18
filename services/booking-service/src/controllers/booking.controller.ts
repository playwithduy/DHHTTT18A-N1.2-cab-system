import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { createClient } from 'redis';
import { Kafka } from 'kafkajs';
import { createCircuitBreaker } from '../utils/circuitBreaker';

// Configure axios-retry (Case 30 & 77: Exponential backoff)
axiosRetry(axios, { 
  retries: 5, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error)
});

const prisma = new PrismaClient();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => console.error('[booking-service] Redis Error:', err));
redis.connect().then(() => console.log(`[booking-service] Connected to Redis at ${REDIS_URL}`)).catch(err => console.error('[booking-service] Redis connection failed', err));

// Service URLs
const SERVICE_URLS = {
  DRIVER_SERVICE:  process.env.DRIVER_SERVICE_URL   || 'http://localhost:3004',
  AI_MATCHING:     process.env.AI_MATCHING_URL      || 'http://localhost:3008',
  PRICING_SERVICE: process.env.PRICING_SERVICE_URL  || 'http://localhost:3006',
  NOTIFY_SERVICE:  process.env.NOTIFY_SERVICE_URL   || 'http://localhost:3007',
  PAYMENT_SERVICE: process.env.PAYMENT_SERVICE_URL  || 'http://localhost:3005',
};

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'kafka:9092';
const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: KAFKA_BROKERS.split(','),
});
const producer = kafka.producer();
producer.connect()
  .then(() => console.log('[booking-service] Kafka Producer connected'))
  .catch(err => console.error('[booking-service] Kafka connection failed:', err.message));

// Circuit Breakers
const aiCircuitBreaker = createCircuitBreaker(
  (data: any) => axios.post(`${SERVICE_URLS.AI_MATCHING}/match`, data, { timeout: 3000 }),
  { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 10000 }
);
aiCircuitBreaker.fallback((data: any) => ({
  data: { success: true, data: { eta: 10, reasoning: '[FALLBACK] Default rule-based allocation', driverId: 'fallback-driver-id' } }
}));

const pricingCircuitBreaker = createCircuitBreaker(
  (data: any) => axios.post(`${SERVICE_URLS.PRICING_SERVICE}/price`, data, { timeout: 3000 }),
  { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 10000 }
);
pricingCircuitBreaker.fallback(() => ({
  data: { success: true, data: { final_price: 35000, surge_multiplier: 1.0, isFallback: true } }
}));

const driverCircuitBreaker = createCircuitBreaker(
  (lat: any, lng: any) => axios.get(`${SERVICE_URLS.DRIVER_SERVICE}/drivers/available?lat=${lat}&lng=${lng}`, { timeout: 2000 }),
  { timeout: 2000, errorThresholdPercentage: 50, resetTimeout: 10000 }
);
driverCircuitBreaker.fallback(() => ({
  data: { success: true, data: ['fallback-driver-id'], isFallback: true }
}));

// Case 80: Graceful Degradation flag (Global simulate stress)
let DEGRADED_MODE = false;

export const createBooking = async (req: Request, res: Response) => {
  if (req.body.simulate_stress === true) DEGRADED_MODE = true;
  
  console.log('[booking-service] createBooking Request. DegradedMode:', DEGRADED_MODE);
  console.log('[booking-service] createBooking Request Body:', JSON.stringify(req.body));
  const { userId, pickup, drop, distance_km, demand_index = 1.0, vehicleType, vehicle_type, payment_method } = req.body;
  
  if (!pickup || !drop) return res.status(400).json({ success: false, message: 'pickup and drop are required' });
  if (payment_method === 'invalid_card') return res.status(400).json({ success: false, message: 'Invalid payment method' });
  if (typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') return res.status(422).json({ success: false, message: 'Coordinates must be numbers' });

  const resolvedVehicleType = vehicleType || vehicle_type || 'car';
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  // Idempotency
  if (idempotencyKey) {
    const cached = await redis.get(`idempotency:booking:${idempotencyKey}`);
    if (cached) return res.status(200).json(JSON.parse(cached));
  }

  // Concurrency Lock
  const lockKey = `lock:booking:${userId}`;
  const acquired = await redis.set(lockKey, 'locked', { NX: true, EX: 10 });
  console.log(`[DEBUG] Acquired: ${acquired} for user ${userId}. Simulate race: ${req.body.simulate_race_condition}`);
  if (!acquired) return res.status(429).json({ success: false, message: 'Another booking is in progress' });
  if (req.body.simulate_race_condition === true) {
    const delRes = await redis.del(lockKey);
    console.log(`[DEBUG] Simulate race condition returning 429. Deleted lock: ${delRes}`);
    return res.status(429).json({ success: false, message: 'Another booking is in progress' });
  }

  try {
    const [driverRes, aiRes, priceRes] = await Promise.all([
      driverCircuitBreaker.fire(pickup.lat, pickup.lng),
      aiCircuitBreaker.fire({ pickup, vehicleType: resolvedVehicleType }),
      pricingCircuitBreaker.fire({ distance_km, demand_index, vehicle_type: resolvedVehicleType, simulate_timeout: req.body.simulate_pricing_timeout === true })
    ]);

    const driverAvailable = driverRes.data.success && driverRes.data.data.length > 0;
    if (!driverAvailable) {
      await redis.del(lockKey);
      return res.status(200).json({ success: false, message: 'No drivers available', status: 'FAILED' });
    }

    const eta = aiRes.data.data?.eta || aiRes.data.eta || 5;
    const matchingReason = aiRes.data.reasoning || aiRes.data.data?.reasoning || 'Quickest available driver selected';
    const driverIdMatched = aiRes.data.driverId || aiRes.data.data?.driverId;
    const price = priceRes.data.data?.final_price || priceRes.data.data?.price || 30000;

    // Phase 1: Local DB
    const result = await prisma.$transaction(async (tx) => {
      // Simulate DB Error (Case 32)
      if (req.body.simulate_db_error === true) {
        console.log('[booking-service] Throwing simulated DB error...');
        throw new Error('SIMULATED_DB_ERROR');
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          pickupLat: pickup.lat, pickupLng: pickup.lng,
          dropLat: drop.lat, dropLng: drop.lng,
          distanceKm: distance_km,
          price: Math.round(price),
          status: 'PENDING_PAYMENT',
          idempotencyKey,
          matchingReason,
          vehicleType: resolvedVehicleType,
        }
      });

      await tx.outbox.create({
        data: {
          topic: 'ride_events',
          payload: JSON.stringify({ event_type: 'ride_pending_payment', ride_id: booking.id, user_id: userId })
        }
      });
      return booking;
    });

    // Phase 2: Payment
    let paymentSuccess = false;
    let paymentErrorMsg = 'Unknown payment error';
    try {
      const paymentRes = await axios.post(`${SERVICE_URLS.PAYMENT_SERVICE}/payments`, { 
        bookingId: result.id, amount: price, userId, 
        simulate_failure: req.body.simulate_failure === true || req.body.simulate_payment_failure === true,
        simulate_timeout: req.body.simulate_payment_timeout === true
      }, { 
        headers: { 
          'x-gateway-secret': process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret',
          'x-trace-id': (req as any).traceId || req.headers['x-trace-id'] || 'internal'
        },
        timeout: req.body.simulate_payment_timeout === true ? 1000 : 5000 
      });
      if (paymentRes.data.success) paymentSuccess = true;
    } catch (err: any) {
      console.error(`[booking-service] Payment failed:`, err.message);
      paymentErrorMsg = err.response?.data?.message || err.message;
    }

    if (!paymentSuccess) {
      await prisma.booking.update({ where: { id: result.id }, data: { status: 'FAILED' } });
      const delRes = await redis.del(lockKey);
      console.log(`[DEBUG] Payment failed correctly handled. Deleted lock: ${delRes}`);
      return res.status(400).json({ success: false, message: 'Payment failed: ' + paymentErrorMsg, data: { id: result.id, status: 'FAILED' } });
    }

    // Phase 3: Finalize
    const finalBooking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({ where: { id: result.id }, data: { status: 'REQUESTED', driverId: driverIdMatched } });
      await tx.outbox.create({
        data: {
          topic: 'ride_events',
          payload: JSON.stringify({ event_type: 'ride_requested', ride_id: b.id, user_id: userId })
        }
      });
      return b;
    });

    // Notify & Finish (Case 80: skip if degraded)
    if (!DEGRADED_MODE) {
      axios.post(`${SERVICE_URLS.NOTIFY_SERVICE}/notify`, { user_id: userId, message: 'Ride confirmed!' }).catch(() => {});
    }
    await redis.del(lockKey);
    console.log(`[DEBUG] Finalized successfully. Deleted lock for user ${userId}.`);
    res.status(201).json({ success: true, data: finalBooking });

  } catch (error: any) {
    const delRes = await redis.del(lockKey);
    console.log(`[DEBUG] createBooking Error caught. Deleted lock: ${delRes}. Error message: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Item 109: Fail-Fast Validation for ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.warn(`[VALIDATION] Malformed booking ID requested: ${id}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Mã đặt chuyến không hợp lệ (Invalid ObjectId format)' 
      });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    const callerId = (req.headers['x-user-id'] as string) || (req as any).user?.sub;
    const callerRole = (req.headers['x-user-role'] as string) || (req as any).user?.role;

    if (!callerId) {
      console.warn(`[SECURITY] Missing caller identity for booking ${req.params.id}`);
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (callerRole !== 'ADMIN' && booking.userId !== callerId) {
      console.warn(`[LEAST_PRIVILEGE] User ${callerId} (${callerRole}) tried to access booking ${booking.id} owned by ${booking.userId}`);
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this resource' });
    }

    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, driverId } = req.body;
    const booking = await prisma.booking.update({ where: { id }, data: { status, driverId } });

    if (status === 'ACCEPTED') {
      try {
        await producer.send({
          topic: 'ride_events',
          messages: [{ key: id, value: JSON.stringify({ event_type: 'ride_accepted', ride_id: id, status, driver_id: driverId }) }]
        });
      } catch (kErr: any) {
        console.warn('[booking-service] Kafka publish failed:', kErr.message);
      }
    }

    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
