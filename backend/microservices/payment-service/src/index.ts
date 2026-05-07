// Dịch vụ Thanh toán — Stripe + Logic thử lại (Trình tự 9.5)
import Stripe from 'stripe';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { PrismaClient } from '@prisma/client';

import { encrypt, decrypt, maskData } from './utils/crypto';

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const prisma   = new PrismaClient();

const MAX_RETRIES      = 3;
const RETRY_DELAYS_MS  = [5000, 15000, 30000]; // thời gian chờ tăng dần (exponential backoff)

// ─── Kafka ────────────────────────────────────────────────────
const kafka    = new Kafka({ clientId: 'payment-service', brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','), retry: { retries: 0 } });
const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: 'payment-service-group' });

// ─── Bộ xử lý Thanh toán ────────────────────────────────────────
async function processPayment(bookingId: string, amount: number, stripeCustomerId?: string): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Thanh toán] Lần thử ${attempt}/${MAX_RETRIES} cho hành trình ${bookingId}`);

      // Khởi tạo ý định thanh toán (PaymentIntent)
      const intent = await stripe.paymentIntents.create({
        amount:   Math.round(amount), // amount in smallest currency unit
        currency: 'vnd',
        customer: stripeCustomerId,
        metadata: { bookingId },
        confirm:  true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });

      if (intent.status === 'succeeded') {
        // Cập nhật Cơ sở dữ liệu
        await prisma.payment.upsert({
          where:  { bookingId },
          update: { status: 'SUCCESS', stripeIntentId: intent.id, paidAt: new Date() },
          create: {
            bookingId,
            amount,
            currency: 'VND',
            status:   'SUCCESS',
            stripeIntentId: intent.id,
            paidAt:   new Date(),
          },
        });

        // Phát đi thông báo thành công
        await producer.send({
          topic: 'payment.completed',
          messages: [{
            key:   bookingId,
            value: JSON.stringify({ bookingId, amount, stripeIntentId: intent.id, timestamp: new Date().toISOString() }),
          }],
        });

        console.log(`[Thanh toán] ✅ Thanh toán cho hành trình ${bookingId} thành công`);
        return; // Thành công — thoát vòng lặp thử lại
      }

      throw new Error(`Payment status: ${intent.status}`);

    } catch (err: any) {
      lastError = err;
      console.error(`[Thanh toán] ❌ Lần thử ${attempt} thất bại: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        // Phát đi thông báo đang thử lại
        await producer.send({
          topic: 'payment.retrying',
          messages: [{
            key:   bookingId,
            value: JSON.stringify({ bookingId, attempt, reason: err.message, timestamp: new Date().toISOString() }),
          }],
        });

        // Chờ trước khi thử lại (thời gian chờ tăng dần)
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
      }
    }
  }

  // Đã hết số lần thử lại cho phép
  console.error(`[Thanh toán] 💀 Đã hết lượt thử lại thanh toán cho hành trình ${bookingId}`);

  await prisma.payment.upsert({
    where:  { bookingId },
    update: { status: 'FAILED', failureReason: lastError?.message },
    create: {
      bookingId,
      amount,
      currency: 'VND',
      status:   'FAILED',
      failureReason: lastError?.message,
      paidAt:   new Date(), // Added this to match schema usually
    },
  });

  // Phát đi thông báo đã hết lượt thử lại
  await producer.send({
    topic: 'payment.retry_exhausted',
    messages: [{
      key:   bookingId,
      value: JSON.stringify({ bookingId, reason: lastError?.message, timestamp: new Date().toISOString() }),
    }],
  });
}

// ─── Bộ tiếp nhận Kafka ───────────────────────────────────────────
async function startConsumer() {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topics: ['ride.completed'], fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }: { message: any }) => {
        const data = JSON.parse(message.value?.toString() || '{}');
        const { bookingId, fare, customerId } = data;

        if (!bookingId || !fare?.total) {
          console.warn('[payment] Missing bookingId or fare in ride.completed event');
          return;
        }

        // Lấy mã khách hàng Stripe nếu có
        const user = await prisma.user.findUnique({ where: { id: customerId }, select: { stripeCustomerId: true } });
        await processPayment(bookingId, fare.total, user?.stripeCustomerId || undefined);
      },
    });

    console.log('[payment-service] Bộ tiếp nhận đang chạy, chờ sự kiện hoàn tất hành trình (ride.completed)...');
  } catch (err: any) {
    console.error('[payment-service] Kafka connect skipped (dev/mock mode):', err.message);
    // DO NOT process.exit(1) here so the HTTP API can still work
  }
}

// ─── Cổng giao tiếp HTTP ──────────────────────────────────────────────────
import express, { Request, Response } from 'express';
import { requireGateway } from './middleware/gatewayCheck';
import { metricsMiddleware, getMetrics } from './middleware/metrics';
import morgan from 'morgan';

const app = express();
app.use(express.json());

// Bước 112, 113: Siêu dữ liệu giám sát (Monitoring Metadata)
app.use(metricsMiddleware);
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'payment-service',
    level: 'INFO',
    trace_id: (req as any).traceId || 'unknown',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    latency: tokens['response-time'](req, res) + ' ms'
  });
}));

app.use(requireGateway);

app.get('/metrics', getMetrics);

// Ghi nhận thanh toán — Tích hợp mô hình Saga (Mục 33, 36)
app.post('/payments', async (req: Request, res: Response) => {
  const { bookingId, amount, userId, simulate_failure, simulate_timeout } = req.body;

  if (simulate_timeout === true) {
    console.log(`[payment] Simulating timeout for booking ${bookingId}`);
    return; // Sẽ bị quá hạn (timeout)
  }

  // Giả lập độ trễ mạng (Luôn trì hoãn để minh họa luồng hoạt động microservices)
  await new Promise(r => setTimeout(r, 800));

  if (simulate_failure === true) {
    console.log(`[payment] Simulated failure for booking ${bookingId}`);
    return res.status(400).json({ success: false, message: 'Giả lập thanh toán thất bại' });
  }

  try {
    // 1. Kiểm tra trùng lặp (Idempotency Check - Mục 34)
    const existing = await prisma.payment.findUnique({ where: { bookingId } });
    if (existing) {
      // [TC-34] [Level 34]: Cơ chế rà soát hồ sơ thanh toán (Idempotency Check).
      return res.json({ success: true, data: existing, message: 'Đã trùng lặp request (Idempotency hit)' });
    }

    // Sử dụng số thẻ được cung cấp hoặc để trống nếu không phải kiểm thử
    const rawCardNumber = req.body.cardNumber;
    if (!rawCardNumber && req.body.paymentMethod === 'CARD') {
      return res.status(400).json({ success: false, message: 'Yêu cầu số thẻ' });
    }
    const safeCardNumber = rawCardNumber || 'CASH_OR_WALLET_TX';
    const encryptedCard = encrypt(safeCardNumber);
    
    // Giả lập độ trễ mạng
    await new Promise(r => setTimeout(r, 800));

    let stripeIntentId = `pi_${Math.random().toString(36).substr(2, 15)}`;
    let status = 'SUCCESS';
    let errorMessage = null;

    // Các kích hoạt giả lập (Simulation Triggers)
    if (rawCardNumber === 'declined') {
      return res.status(402).json({ 
        success: false, 
        message: 'Thẻ của bạn bị từ chối. (Lỗi giả lập)',
        code: 'card_declined'
      });
    }
    if (rawCardNumber === 'expired') {
      return res.status(402).json({ 
        success: false, 
        message: 'Thẻ của bạn đã hết hạn. (Lỗi giả lập)',
        code: 'expired_card'
      });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        currency: 'VND',
        status: status as any,
        stripeIntentId,
        paidAt: new Date(),
        failureReason: encryptedCard
      }
    });

    console.log(`\x1b[32m[PAYMENT]\x1b[0m SUCCESS: Booking=${bookingId}, Amount=${amount}đ`);

    res.status(201).json({ 
      success: true, 
      message: 'Thanh toán được xử lý thành công (Giả lập)',
      data: payment 
    });
  } catch (err: any) {
    console.log(`\x1b[31m[PAYMENT_ERROR]\x1b[0m Failed for Booking=${bookingId}: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /payments/:id
app.get('/payments/:id', async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { bookingId: req.params.id } });
  if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thanh toán' });
  
  // Che giấu dữ liệu (Trường hợp 90)
  const maskedPayment = {
    ...payment,
    cardNumber: payment.failureReason ? maskData(decrypt(payment.failureReason)) : '****'
  };
  
  res.json({ success: true, data: maskedPayment });
});

// POST /payments/:id/refund
app.post('/payments/:id/refund', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { bookingId: req.params.id } });
    if (!payment || payment.status !== 'SUCCESS') {
      return res.status(400).json({ success: false, message: 'Không thể hoàn tiền cho giao dịch này' });
    }

    const refund = await stripe.refunds.create({ payment_intent: payment.stripeIntentId! });
    await prisma.payment.update({ where: { bookingId: req.params.id }, data: { status: 'REFUNDED' } });

    res.json({ success: true, data: { refundId: refund.id } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bước 87: Cổng kiểm tra tính bảo mật của dữ liệu khi lưu trữ (Audit endpoint)
app.get('/internal/db-audit/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thanh toán' });
  
  res.json({
    success: true,
    data: {
      bookingId: payment.bookingId,
      rawFailureReasonInDB: payment.failureReason, // THIS IS THE ENCRYPTED STRING
      isPlaintext: !payment.failureReason || !payment.failureReason.includes(':') 
    }
  });
});

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', service: 'payment-service' }));

const PORT = process.env.PORT || 3005;
app.listen(PORT, async () => {
  await startConsumer();
  console.log(`[payment-service] Running on port ${PORT}`);
});
