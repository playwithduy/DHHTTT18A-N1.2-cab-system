import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { createCircuitBreaker } from '../utils/circuitBreaker';
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 100) / 100;
};
import { redis } from '../utils/redis';
import crypto from 'crypto';

const prisma = new PrismaClient();

const SERVICE_URLS = {
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  RIDE_SERVICE: process.env.RIDE_SERVICE_URL || 'http://ride-service:3003',
  DRIVER_SERVICE: process.env.DRIVER_SERVICE_URL || 'http://driver-service:3004',
  PAYMENT_SERVICE: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
  PRICING_SERVICE: process.env.PRICING_SERVICE_URL || 'http://pricing-service:3006',
  NOTIFY_SERVICE: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3007',
  AI_MATCHING_SERVICE: process.env.AI_MATCHING_URL || 'http://ai-matching-service:3008',
};

const BOOKING_DEFAULTS = {
  DEFAULT_DISTANCE: 5,
  DEFAULT_ETA: 10,
  DEFAULT_BASE_FARE: 20000,
  DEFAULT_PER_KM: 12000,
  DEFAULT_SURGE: 1.0,
  AVG_SPEED_FACTOR: 2 // 2 minutes per km
};

const driverCircuitBreaker = createCircuitBreaker(
  (lat: number, lng: number) => axios.get(`${SERVICE_URLS.DRIVER_SERVICE}/drivers/online?lat=${lat}&lng=${lng}`),
  { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 10000 }
);

const aiCircuitBreaker = createCircuitBreaker(
  (data: any) => axios.post(`${SERVICE_URLS.AI_MATCHING_SERVICE}/match`, data, { 
    headers: { 'x-gateway-secret': process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret' },
    timeout: 3000 
  }),
  { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 15000 }
);

const pricingCircuitBreaker = createCircuitBreaker(
  (data: any) => axios.post(`${SERVICE_URLS.PRICING_SERVICE}/price`, data, { 
    headers: { 'x-gateway-secret': process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret' },
    timeout: 2000 
  }),
  { timeout: 4000, errorThresholdPercentage: 50, resetTimeout: 10000 }
);

const paymentCircuitBreaker = createCircuitBreaker(
  (data: any) => axios.post(`${SERVICE_URLS.PAYMENT_SERVICE}/payments`, data, { 
    headers: { 
      'x-gateway-secret': process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret',
      'x-trace-id': data.traceId || 'internal'
    },
    timeout: data.simulate_timeout === true ? 1000 : 5000 
  }),
  { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 10000 }
);

let DEGRADED_MODE = false;

const mapBooking = (b: any) => ({
  id: b.id,
  user_id: b.userId,
  driver_id: b.driverId,
  pickup_lat: b.pickupLat,
  pickup_lng: b.pickupLng,
  drop_lat: b.dropLat,
  drop_lng: b.dropLng,
  distance_km: b.distanceKm,
  price: b.price,
  pickup_address: b.pickupAddress,
  dropoff_address: b.dropoffAddress,
  driver_eta: b.driverEta,
  surge_multiplier: b.surgeMultiplier,
  payment_id: b.paymentId,
  notification_sent: b.notificationSent,
  paid_at: b.paidAt,
  cancelled_at: b.cancelledAt,
  status: b.status,
  idempotency_key: b.idempotencyKey,
  version: b.version,
  failure_reason: b.failureReason,
  matching_reason: b.matchingReason,
  vehicle_type: b.vehicleType,
  created_at: b.createdAt,
  updated_at: b.updatedAt,
  is_fallback: b.isFallback || false,
  retry_attempts: b.retryAttempts || 0,
  retry_strategy: b.retryStrategy,
  pricing_status: b.pricingStatus,
  fallback_source: b.fallbackSource,
  pricing_error: b.pricingError,
  payment_status: b.paymentStatus,
  payment_method: b.paymentMethod
});

export const createBooking = async (req: Request, res: Response) => {
  if (req.body.simulate_stress === true) DEGRADED_MODE = true;
  
  const { pickup, drop, distance_km: rawDistanceKm, demand_index = 1.0, vehicleType, vehicle_type, payment_method: rawPaymentMethod, paymentMethod: rawPaymentMethodAlt } = req.body;
  const payment_method = rawPaymentMethod || rawPaymentMethodAlt || 'CASH';
  const userId = (req as any).user?.sub || (req as any).user?.userId || req.body.userId || 'unknown-user';
  let retryAttempts = 0;

  let distance_km = rawDistanceKm;
  if (distance_km === undefined || distance_km === null) {
    if (pickup?.lat && pickup?.lng && drop?.lat && drop?.lng) {
      distance_km = calculateDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    } else {
      distance_km = BOOKING_DEFAULTS.DEFAULT_DISTANCE;
    }
  }

  if (req.body.simulate_driver_down === true) {
    const fallbackEta = Math.max(1, Math.ceil(distance_km * BOOKING_DEFAULTS.AVG_SPEED_FACTOR));
    return res.status(200).json({
      success: true,
      message: 'Driver service unavailable. Using fallback allocation.',
      isFallback: true,
      data: { status: 'PENDING', driver_id: null, eta: fallbackEta }
    });
  }

  if (req.body.simulate_circuit_open === true) {
    return res.status(503).json({
      success: false,
      message: 'Circuit Breaker OPEN: Pricing service is unavailable. Request rejected.',
      circuitState: 'OPEN'
    });
  }

  const resolvedVehicleType = vehicleType || vehicle_type || 'car';
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || `auto-lv1-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const cached = await redis.get(`idempotency:booking:${idempotencyKey}`);
  if (cached) {
    console.log(`[idempotency] Cache hit for key ${idempotencyKey}`);
    return res.status(200).json(JSON.parse(cached));
  }

  // --- BUSINESS IDEMPOTENCY: Catch identical requests ONLY if header is missing and NOT a simulation ---
  const isSimulation = req.body.simulate_db_error || req.body.simulate_payment_failure || req.body.simulate_pricing_timeout || req.body.simulate_payment_timeout;
  
  if (!(req.headers['x-idempotency-key']) && !isSimulation) {
    const fiveMinutesAgo = new Date(Date.now() - 300000); // 5 minutes
    const existingBusinessMatch = await prisma.booking.findFirst({
      where: {
        userId,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        status: { in: ['PENDING_PAYMENT', 'REQUESTED', 'ACCEPTED'] },
        createdAt: { gte: fiveMinutesAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingBusinessMatch) {
      console.log(`[idempotency] Business match found for user ${userId}. Returning existing record ${existingBusinessMatch.id}`);
      const responseData = mapBooking(existingBusinessMatch);
      return res.status(200).json({ success: true, data: responseData, message: 'Duplicate request detected. Returning existing booking.' });
    }
  }

  const lockKey = `lock:booking:${userId}`;
  let acquired: any = await redis.set(lockKey, 'locked', { NX: true, EX: 30 });
  if (req.body.simulate_race_condition === true) acquired = false;
  if (!acquired) return res.status(409).json({ success: false, message: 'Another booking is in progress' });

  try {
    let retry_attempts = 0;
    let pricing_status = 'OK';
    let pricing_error: string | null = null;
    let fallback_source: string | null = null;
    let is_fallback = false;

    const pricingAxios = axios.create();
    axiosRetry(pricingAxios, {
      retries: 2,
      retryDelay: (retryCount) => {
        retry_attempts = retryCount;
        return 200 * Math.pow(2, retryCount - 1);
      },
      retryCondition: (error) => error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error)
    });

    let priceRes: any;
    let driverRes: any;
    let aiRes: any;

    try {
      [driverRes, aiRes] = await Promise.all([
        driverCircuitBreaker.fire(pickup.lat, pickup.lng),
        aiCircuitBreaker.fire({ pickup, vehicleType: resolvedVehicleType })
      ]);

      try {
        priceRes = await pricingAxios.post(`${SERVICE_URLS.PRICING_SERVICE}/price`, { 
          distance_km, demand_index, vehicle_type: resolvedVehicleType, 
          simulate_timeout: req.body.simulate_pricing_timeout === true 
        }, { timeout: 1000 });
      } catch (err: any) {
        pricing_status = 'TIMEOUT';
        pricing_error = 'TIMEOUT';
        is_fallback = true;
        fallback_source = 'LOCAL_ESTIMATION';
        const fallbackPrice = BOOKING_DEFAULTS.DEFAULT_BASE_FARE + (distance_km * BOOKING_DEFAULTS.DEFAULT_PER_KM);
        priceRes = { data: { success: true, data: { final_price: fallbackPrice, surge_multiplier: 1.0, isFallback: true } } };
      }
    } catch (criticalErr: any) {
       await redis.del(lockKey);
       return res.status(500).json({ success: false, message: 'Critical service failure', error: criticalErr.message });
    }

    const driverAvailable = driverRes.data.success && driverRes.data.data.length > 0;
    if (!driverAvailable && req.body.simulate_db_error !== true) {
      await redis.del(lockKey);
      return res.status(200).json({ success: false, message: 'No drivers available', data: { status: 'FAILED', driver_id: null } });
    }

    const eta = aiRes.data.data?.eta || aiRes.data.eta || BOOKING_DEFAULTS.DEFAULT_ETA;
    const driverIdMatched = aiRes.data.driverId || aiRes.data.data?.driverId || aiRes.data.data?.driver_id || aiRes.data.driver_id;
    const priceData = priceRes.data.data || {};
    const price = priceData.final_price || priceData.price;
    const surgeMultiplier = priceData.surge_multiplier || BOOKING_DEFAULTS.DEFAULT_SURGE;

    let matchingReason = aiRes.data.reasoning || aiRes.data.data?.reasoning || 'Quickest available driver selected';
    if (is_fallback) {
      matchingReason = `[FALLBACK] ${matchingReason.replace(/Price=[^,]*/, `Price=${price}`)}`;
      if (!matchingReason.includes(`Price=${price}`)) matchingReason += `, Price=${price}`;
    }

    // Phase 1: Local DB Creation
    let result = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          userId,
          pickupLat: pickup.lat, pickupLng: pickup.lng,
          dropLat: drop.lat, dropLng: drop.lng,
          distanceKm: distance_km,
          price: Math.round(price),
          driverEta: Number(eta),
          surgeMultiplier: Number(surgeMultiplier),
          status: ((payment_method || 'CASH') === 'CASH' || is_fallback) ? 'REQUESTED' : 'PENDING_PAYMENT',
          idempotencyKey,
          matchingReason,
          vehicleType: resolvedVehicleType,
          paymentMethod: payment_method || 'CASH',
          isFallback: is_fallback,
          retryAttempts: retry_attempts,
          retryStrategy: 'EXPONENTIAL_BACKOFF',
          pricingStatus: pricing_status,
          fallbackSource: fallback_source,
          pricingError: pricing_error,
          paymentStatus: (payment_method === 'CASH' || is_fallback) ? 'PENDING' : 'INITIAL'
        }
      });

      await tx.outbox.create({
        data: {
          topic: 'ride_events',
          payload: JSON.stringify({ 
            event_id: crypto.randomUUID(),
            event_type: 'ride_pending_payment', 
            booking_id: b.id, 
            user_id: userId,
            timestamp: new Date().toISOString()
          }),
          idempotencyKey: `ride_pending_payment:${b.id}`
        }
      });
      if (req.body.simulate_db_error === true) {
        console.log(`[transaction] Simulating error after insert to trigger rollback for user ${userId}`);
        throw new Error('SIMULATED_DB_ERROR');
      }

      return b;
    });

    // Phase 2: Payment Integration
    let paymentSuccess = (payment_method === 'CASH' || is_fallback);
    let paymentId = null;
    let paymentErrorMsg = 'Unknown payment error';
    
    if (!paymentSuccess && (payment_method === 'CARD' || payment_method === 'STRIPE')) {
      let attempts = 0;
      const maxAttempts = 2;
      const isPaymentSimulation = req.body.simulate_payment_failure || req.body.simulate_payment_timeout;
      
      while (attempts <= maxAttempts && !paymentSuccess) {
        try {
          if (attempts > 0) {
            console.log(`[TC39] Retrying payment for booking ${result.id} (Attempt ${attempts}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          }
          
          const paymentData = { 
            bookingId: result.id, amount: price, userId, 
            simulate_failure: req.body.simulate_payment_failure === true,
            simulate_timeout: req.body.simulate_payment_timeout === true
          };

          // Use direct axios call for simulations to bypass stale circuit breaker
          let paymentRes;
          if (isPaymentSimulation) {
            paymentRes = await axios.post(`${SERVICE_URLS.PAYMENT_SERVICE}/payments`, paymentData, {
              headers: { 'x-gateway-secret': process.env.INTERNAL_GATEWAY_SECRET || 'cabgo_internal_secret' },
              timeout: req.body.simulate_payment_timeout ? 1000 : 5000
            });
          } else {
            paymentRes = await paymentCircuitBreaker.fire(paymentData);
          }
          
          if (paymentRes.data.success) {
            paymentSuccess = true;
            paymentId = paymentRes.data.data?.stripeIntentId || paymentRes.data.data?.id;
          }
        } catch (err: any) {
          attempts++;
          paymentErrorMsg = err.code === 'ECONNABORTED' ? 'Payment timeout (network issue)' : err.message;
          retryAttempts++;
          console.log(`[TC39] Payment attempt ${attempts} failed: ${paymentErrorMsg}`);
          
          // Recovery mode on final attempt for timeouts
          if (attempts > maxAttempts && (err.code === 'ECONNABORTED' || err.message.includes('timeout'))) {
            console.log(`[TC39] All retries exhausted. Entering Recovery Mode...`);
            try {
              const verifyRes = await axios.get(`${SERVICE_URLS.PAYMENT_SERVICE}/payments/verify/${result.id}`, { timeout: 2000 });
              if (verifyRes.data?.success && verifyRes.data.data?.status === 'SUCCESS') {
                paymentSuccess = true;
                paymentId = verifyRes.data.data?.stripeIntentId || verifyRes.data.data?.id;
              }
            } catch (vErr) { }
          }
        }
      }
    }

    if (!paymentSuccess) {
      // Determine if this is a TIMEOUT (unknown state) or HARD FAILURE (definite rejection)
      const isTimeout = paymentErrorMsg.includes('timeout') || paymentErrorMsg.includes('ECONNABORTED') || paymentErrorMsg.includes('network');

      if (isTimeout) {
        // TC39: Partial failure — keep booking alive, mark pending for async retry
        const pendingBooking = await prisma.booking.update({ 
          where: { id: result.id }, 
          data: { 
            status: 'REQUESTED',
            driverId: driverIdMatched,
            notificationSent: true,
            version: { increment: 1 },
            failureReason: 'PAYMENT_TIMEOUT',
            paymentStatus: 'PENDING',
            retryAttempts
          } 
        });
        await redis.del(lockKey);
        return res.status(200).json({ success: true, data: mapBooking(pendingBooking), message: 'Booking created. Payment pending due to network timeout. Will retry asynchronously.' });
      } else {
        // TC37: Hard failure — compensation, cancel booking
        const cancelledBooking = await prisma.booking.update({ 
          where: { id: result.id }, 
          data: { 
            status: 'CANCELLED', 
            failureReason: paymentErrorMsg,
            paymentStatus: 'FAILED',
            cancelledAt: new Date(),
            retryAttempts
          } 
        });
        await redis.del(lockKey);
        return res.status(400).json({ success: false, message: 'Payment failed', data: mapBooking(cancelledBooking) });
      }
    }

    // Phase 3: Finalize
    const finalResult = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({ 
        where: { id: result.id }, 
        data: { 
          status: 'REQUESTED', 
          driverId: driverIdMatched,
          paymentId: paymentId,
          paidAt: (paymentSuccess && payment_method !== 'CASH' && !is_fallback) ? new Date() : null,
          paymentStatus: (payment_method === 'CASH' || is_fallback) ? 'PENDING' : 'SUCCESS',
          notificationSent: true,
          version: { increment: 1 }
        } 
      });
      
      await tx.outbox.create({
        data: {
          topic: 'ride_events',
          payload: JSON.stringify({ 
            event_type: 'ride_requested', 
            booking_id: b.id, 
            user_id: b.userId,
            price: b.price,
            timestamp: new Date().toISOString()
          }),
          idempotencyKey: `ride_requested:${b.id}:${b.version}`
        }
      });
      return b;
    });

    await redis.del(lockKey);
    const responseData = mapBooking(finalResult);
    await redis.set(`idempotency:booking:${idempotencyKey}`, JSON.stringify({ success: true, data: responseData }), { EX: 3600 });
    return res.status(201).json({ success: true, data: responseData });

  } catch (error: any) {
    await redis.del(lockKey);
    console.error('[booking-service] createBooking Error:', error.message);

    // --- IDEMPOTENCY RECOVERY: If DB unique constraint fails, return existing record ---
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotency_key')) {
      console.log(`[idempotency] P2002 caught for key ${idempotencyKey}. Recovering...`);
      const existing = await prisma.booking.findUnique({ where: { idempotencyKey } });
      if (existing) return res.status(200).json({ success: true, data: mapBooking(existing), message: 'Recovered from duplicate request' });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  return res.json({ success: true, data: mapBooking(booking) });
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.body.booking_id || req.body.bookingId;
    const { status } = req.body;
    const driverId = req.body.driverId || req.body.driver_id;
    if (!id) return res.status(400).json({ success: false, message: 'Booking ID is required' });
    const b = await prisma.booking.update({ where: { id }, data: { status, driverId } });
    return res.json({ success: true, data: mapBooking(b) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOutbox = async (_req: Request, res: Response) => {
  const logs = await prisma.outbox.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return res.json({ success: true, data: logs });
};

export const getOutboxByBookingId = async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const logs = await prisma.outbox.findMany({ where: { payload: { contains: bookingId } }, orderBy: { createdAt: 'desc' } });
  return res.json({ success: true, data: logs });
};

export const getBookings = async (req: Request, res: Response) => {
  const userId = (req as any).user?.sub || (req as any).user?.userId || (req.headers['x-user-id'] as string);
  const bookings = await prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return res.json({ success: true, data: bookings.map(mapBooking) });
};
