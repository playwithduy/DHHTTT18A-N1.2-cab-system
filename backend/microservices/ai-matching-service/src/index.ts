import { createClient } from 'redis';
import { Kafka, Producer } from 'kafkajs';

interface DriverFeatures {
  driverId:       string;
  lat:            number;
  lng:            number;
  rating:         number;
  acceptanceRate: number;
  totalRides:     number;
  vehicleType:    string;
  distanceKm:     number;
  etaMinutes:     number;
  status:         string;
}

const MODEL_VERSION = 'v1.2.0-alpha';

// ── Centralized AI Matching Configuration (NO hardcoded magic numbers) ──
const AI_CONFIG = {
  AVG_SPEED_FACTOR:    parseFloat(process.env.AVG_SPEED_FACTOR || '2'),  // minutes per km (~30km/h urban)
  SEARCH_RADIUS_KM:    parseInt(process.env.SEARCH_RADIUS_KM || '50'),
  DEFAULT_DISTANCE_KM: parseInt(process.env.DEFAULT_DISTANCE_KM || '5'),
  DEFAULT_RATING:      parseFloat(process.env.DEFAULT_DRIVER_RATING || '4.5'),
  DEFAULT_ACCEPTANCE:  parseFloat(process.env.DEFAULT_ACCEPTANCE_RATE || '0.9'),
  DEFAULT_RIDES:       parseInt(process.env.DEFAULT_TOTAL_RIDES || '100'),
  DEFAULT_VEHICLE:     process.env.DEFAULT_VEHICLE_TYPE || 'car',
  DRIFT_THRESHOLD_KM:  parseInt(process.env.DRIFT_THRESHOLD_KM || '100'),
  MAX_DISTANCE_KM:     parseInt(process.env.MAX_DISTANCE_KM || '1000'),
};

import { MatchingAgent } from './agent.orchestrator';

const agent = new MatchingAgent();

export class AIMatchingService {
  private redis: ReturnType<typeof createClient>;
  private producer: Producer;

  constructor() {
    this.redis    = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const kafka   = new Kafka({ clientId: 'ai-matching-service', brokers, retry: { retries: 0 }, connectionTimeout: 1000 });
    this.producer = kafka.producer();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async start() {
    try {
      await this.redis.connect();
      console.log('[ai-matching] Redis connected');
    } catch {
      console.warn('[ai-matching] Redis offline (Mocking candidates)');
    }
  }

  async matchRide(rideData: any): Promise<any | null> {
    const startTime = Date.now();
    const lat = parseFloat(rideData.pickup?.lat || 0);
    const lng = parseFloat(rideData.pickup?.lng || 0);
    const { vehicleType = 'any', priority = 'balanced', simulate_tool_error = false, simulate_missing_context = false } = rideData;

    // 1. Get Candidates from Redis (Real Geo-search)
    let candidates: DriverFeatures[] = [];
    try {
      if (this.redis.isOpen) {
        // Search online drivers within configurable radius
        const driverIds = await this.redis.geoSearch('drivers:geo', 
          { latitude: lat, longitude: lng }, 
          { radius: AI_CONFIG.SEARCH_RADIUS_KM, unit: 'km' }
        );

        for (const dId of driverIds) {
          const [features, loc] = await Promise.all([
            this.redis.hGetAll(`driver:${dId}:features`),
            this.redis.hGetAll(`driver:${dId}:location`)
          ]);

          if (features && loc) {
            const dLat = parseFloat(loc.lat);
            const dLng = parseFloat(loc.lng);
            
            // Case 23: Calculate real distance instead of hardcoding
            const distance = this.calculateDistance(lat, lng, dLat, dLng);
            // Dynamic ETA: AVG_SPEED_FACTOR minutes per km (configurable via env)
            const eta = Math.max(1, Math.ceil(distance * AI_CONFIG.AVG_SPEED_FACTOR));

            candidates.push({
              driverId: dId,
              lat: dLat,
              lng: dLng,
              rating: parseFloat(features.rating || String(AI_CONFIG.DEFAULT_RATING)),
              acceptanceRate: parseFloat(features.acceptanceRate || String(AI_CONFIG.DEFAULT_ACCEPTANCE)),
              totalRides: parseInt(features.totalRides || String(AI_CONFIG.DEFAULT_RIDES)),
              vehicleType: features.vehicleType || AI_CONFIG.DEFAULT_VEHICLE,
              distanceKm: parseFloat(distance.toFixed(2)),
              etaMinutes: eta,
              status: 'AVAILABLE'
            });
          }
        }
      }
    } catch (err) {
      console.error('[ai-matching] Error fetching candidates from Redis:', err);
    }

    // Filter by vehicle
    let filtered = candidates.filter(d => vehicleType === 'any' || d.vehicleType === vehicleType);

    if (filtered.length === 0) {
      console.log(`\x1b[34m[AI-MATCH]\x1b[0m No candidates found in Redis.`);
    } else {
      console.log(`\x1b[34m[AI-MATCH]\x1b[0m Found ${filtered.length} candidates for vehicle ${vehicleType}`);
    }

    // 3. Agentic decision — pass demand_index dynamically from request body
    const decision = await agent.selectBestDriver(filtered, rideData.distance_km || AI_CONFIG.DEFAULT_DISTANCE_KM, {
        priority,
        simulate_tool_error,
        demand_index: rideData.demand_index,
    });

    const latencyMs = Date.now() - startTime;
    if (!decision) {
      console.log(`\x1b[34m[AI-MATCH]\x1b[0m \x1b[31mFAILED\x1b[0m to match any driver.`);
      return { success: false, message: 'Matching failed' };
    }

    console.log(`\x1b[34m[AI-MATCH]\x1b[0m \x1b[32mSUCCESS\x1b[0m: Winner=${decision.driverId} (Score: ${decision.metrics.score})`);

    return {
      success: true,
      driverId: decision.driverId,
      score:    decision.metrics.score,
      eta:      decision.metrics.eta,
      reasoning: decision.reasoning,
      mcp_context: decision.mcpContext, // Added this
      drivers:   decision.topDrivers,
      modelVersion: MODEL_VERSION,
      latencyMs
    };
  }

  async getForecast(lat: number, lng: number) {
    return { demand_forecast: (Math.random() * 2 + 1).toFixed(2), timestamp: new Date().toISOString() };
  }
}

import express from 'express';
import morgan from 'morgan';
import { metricsMiddleware, getMetrics } from './middleware/metrics';

const app = express();
app.use(express.json());

// Step 112, 113: Monitoring Metadata
app.use(metricsMiddleware);
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'ai-matching-service',
    level: 'INFO',
    trace_id: (req as any).traceId || 'unknown',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    latency: tokens['response-time'](req, res) + ' ms'
  });
}));

const matchingService = new AIMatchingService();
matchingService.start().catch(console.error);

app.get('/metrics', getMetrics);

app.post(['/', '/match'], async (req, res) => {
  const { pickup, vehicleType, distance_km, simulate_fallback, priority } = req.body;
  // Detect outlier distance using configurable threshold
  if (distance_km && distance_km > AI_CONFIG.MAX_DISTANCE_KM) {
    return res.status(400).json({ success: false, message: `Distance exceeds operational limit of ${AI_CONFIG.MAX_DISTANCE_KM}km` });
  }
  const result = await matchingService.matchRide(req.body);
  const isFallback = simulate_fallback === true;
  const driftDetected = distance_km && distance_km >= AI_CONFIG.DRIFT_THRESHOLD_KM ? true : false;

  // Use reasoning from result if available, or build a basic one
  // Fix reasoning: don't claim success if it failed
  let reasoning = result.success ? (result.reasoning || 'AI matched successfully') : (result.message || 'Matching failed');
  
  if (isFallback) {
    reasoning = 'FALLBACK: Using default rule-based driver assignment';
  }

  const rawDrivers = result.drivers || [];

  res.json({
    ...result,
    topDrivers: rawDrivers,
    isFallback,
    driftDetected,
    reasoning,
  });
});



app.post('/eta', (req, res) => {
  const dist = req.body.distance_km !== undefined ? parseFloat(req.body.distance_km) : 1;
  // Dynamic ETA using configurable speed factor
  const eta = dist === 0 ? 0 : Math.max(1, Math.ceil(dist * AI_CONFIG.AVG_SPEED_FACTOR));
  res.json({ success: true, data: { eta } });
});

app.get('/forecast', (req, res) => {
  const forecast = matchingService.getForecast(
    parseFloat(req.query.lat as string) || 10.76,
    parseFloat(req.query.lng as string) || 106.66
  );
  Promise.resolve(forecast).then(data => res.json({ success: true, data }));
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-matching', version: MODEL_VERSION, config: { speedFactor: AI_CONFIG.AVG_SPEED_FACTOR, searchRadius: AI_CONFIG.SEARCH_RADIUS_KM } }));

app.listen(3008, () => console.log(`[ai-matching] Running on port 3008`));
