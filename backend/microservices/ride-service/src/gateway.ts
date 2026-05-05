// ============================================================
// Ride Service — WebSocket Gateway + GPS Redis Geo
// ============================================================
import { Server as HttpServer, createServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { Kafka, Consumer } from 'kafkajs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ─── Redis clients (pub/sub for socket.io scaling) ────────────
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

// ─── Redis Geo key ────────────────────────────────────────────
const GEO_KEY = 'drivers:geo';

export class RealTimeGateway {
  private io: SocketServer;
  private redisClient = pubClient;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    this.setupRedisAdapter();
    this.setupAuthentication();
    this.setupEventHandlers();
    this.setupKafkaConsumer();
  }

  private async setupRedisAdapter() {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.io.adapter(createAdapter(pubClient, subClient));
    console.log('[gateway] Redis adapter connected');
  }

  // JWT middleware for Socket.IO
  private setupAuthentication() {
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
        (socket as any).userId = decoded.userId;
        (socket as any).role = decoded.role;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const { userId, role } = socket as any;
      console.log(`[gateway] Connected: ${userId} (${role})`);

      // Join personal room
      socket.join(`user:${userId}`);

      // Join ride room (when customer has active ride)
      socket.on('join:ride', (rideId: string) => {
        socket.join(`ride:${rideId}`);
        console.log(`[gateway] ${userId} joined ride:${rideId}`);
      });

      // ── GPS Updates from Driver (every 2-5 seconds) ──────────
      socket.on('gps:update', async (data: { lat: number; lng: number; rideId?: string }) => {
        if (role !== 'driver') return;

        // Store in Redis Geo for proximity queries
        await this.redisClient.geoAdd(GEO_KEY, {
          longitude: data.lng,
          latitude: data.lat,
          member: userId,
        });

        // Also store as hash for quick lookup
        await this.redisClient.hSet(`driver:${userId}:location`, {
          lat: data.lat.toString(),
          lng: data.lng.toString(),
          ts: Date.now().toString(),
        });

        // Broadcast to the ride room
        if (data.rideId) {
          this.io.to(`ride:${data.rideId}`).emit('driver:location_updated', {
            event: 'driver:location_updated',
            data: { driverId: userId, location: { lat: data.lat, lng: data.lng } },
            timestamp: new Date().toISOString(),
          });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[gateway] Disconnected: ${userId} — ${reason}`);
      });
    });
  }

  // ── Kafka → WebSocket bridge ──────────────────────────────────
  private async setupKafkaConsumer() {
    const kafka = new Kafka({
      clientId: 'ride-service-ws',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    const consumer: Consumer = kafka.consumer({ groupId: 'ride-service-ws-group' });
    await consumer.connect();
    await consumer.subscribe({
      topics: [
        'booking.confirmed',
        'driver.assigned',
        'ride.status_changed',
        'payment.completed',
        'payment.failed',
      ],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const data = JSON.parse(message.value?.toString() || '{}');
        this.bridgeKafkaToSocket(topic, data);
      },
    });

    console.log('[gateway] Kafka consumer running');
  }

  private bridgeKafkaToSocket(topic: string, data: Record<string, unknown>) {
    const { bookingId, customerId, driverId, rideId } = data as any;

    switch (topic) {
      case 'booking.confirmed':
      case 'driver.assigned':
        // Notify customer their driver is assigned
        this.io.to(`user:${customerId}`).emit('ride:driver_assigned', {
          event: 'ride:driver_assigned',
          data,
          timestamp: new Date().toISOString(),
        });
        // Also notify the ride room
        if (rideId || bookingId) {
          this.io.to(`ride:${rideId || bookingId}`).emit('ride:status_changed', {
            event: 'ride:status_changed',
            data: { status: 'driver_assigned', ...data },
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'ride.status_changed':
        this.io.to(`ride:${rideId}`).emit('ride:status_changed', {
          event: 'ride:status_changed',
          data,
          timestamp: new Date().toISOString(),
        });
        break;

      case 'payment.completed':
        this.io.to(`user:${customerId}`).emit('payment:success', {
          event: 'payment:success',
          data,
          timestamp: new Date().toISOString(),
        });
        break;

      case 'payment.failed':
        this.io.to(`user:${customerId}`).emit('payment:failed', {
          event: 'payment:failed',
          data,
          timestamp: new Date().toISOString(),
        });
        break;
    }
  }
────────────────────────────
  // Sử dụng Redis GEOSEARCH để tìm kiếm tài xế trong bán kính chỉ định (km).
  async findNearbyDrivers(lat: number, lng: number, radiusKm: number): Promise<string[]> {
    const results = await this.redisClient.geoSearch(
      GEO_KEY,
      { longitude: lng, latitude: lat },
      { radius: radiusKm, unit: 'km' },
      { SORT: 'ASC', COUNT: 10 }
    );
    return results as string[];
  }
}

// ─── Entry point ──────────────────────────────────────────────
const httpServer = createServer();
const gateway = new RealTimeGateway(httpServer);

const PORT = process.env.PORT || 3003;
httpServer.listen(PORT, () => console.log(`[ride-service] WebSocket gateway on port ${PORT}`));
