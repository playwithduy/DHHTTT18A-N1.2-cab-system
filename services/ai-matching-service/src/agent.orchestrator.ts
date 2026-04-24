import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configure retry (TC56: retry when service fails)
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error)
});

// ── Centralized Agent Configuration (NO hardcoded magic numbers) ─────────
const AGENT_CONFIG = {
  DEFAULT_FALLBACK_PRICE: parseInt(process.env.DEFAULT_RIDE_PRICE || '30000'),
  DEFAULT_BASE_FARE:     parseInt(process.env.DEFAULT_BASE_FARE || '28000'),
  DEFAULT_PER_KM_RATE:   parseInt(process.env.DEFAULT_PER_KM_RATE || '11000'),
  AVG_SPEED_FACTOR:      parseFloat(process.env.AVG_SPEED_FACTOR || '2'),  // minutes per km (urban ~30km/h)
  DEFAULT_RATING:        parseFloat(process.env.DEFAULT_DRIVER_RATING || '4.5'),
  DEFAULT_ETA:           parseInt(process.env.DEFAULT_ETA_MINUTES || '10'),
  DEFAULT_ACCEPTANCE:    parseFloat(process.env.DEFAULT_ACCEPTANCE_RATE || '0.8'),
  DEFAULT_RIDES:         parseInt(process.env.DEFAULT_TOTAL_RIDES || '50'),
  DEFAULT_DEMAND_INDEX:  parseFloat(process.env.DEFAULT_DEMAND_INDEX || '1.2'),
  MAX_RATING:            5,
  MAX_ETA_NORM:          20,   // ETA normalization ceiling (minutes)
  MAX_RIDES_NORM:        500,  // Total rides normalization ceiling
};

interface DriverFeatures {
  driverId:       string;
  rating:         number;
  acceptanceRate: number;
  totalRides:     number;
  vehicleType:    string;
  distanceKm:     number;
  etaMinutes:     number;
  status:         string;
}

interface AgentDecision {
  driverId: string;
  reasoning: string;
  traceId?: string;
  metrics: {
    score: number;
    price: number;
    eta: number;
  };
  topDrivers?: any[];
}

export class MatchingAgent {
  private pricingUrl = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3006';

  async selectBestDriver(
    candidates: DriverFeatures[],
    rideDistanceKm: number = 5,
    options: {
      simulate_tool_error?: boolean;
      priority?: 'speed' | 'quality' | 'balanced';
      traceId?: string;
      demand_index?: number;
    } = {}
  ): Promise<AgentDecision | null> {
    const startTime = Date.now();
    const MODEL_VERSION = 'v1.2.0'; // Step 118
    const traceId = options.traceId || `trace-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    if (candidates.length === 0) return null;

    // TC57: Filter out OFFLINE drivers before any processing
    const onlineCandidates = candidates.filter(d => d.status !== 'OFFLINE');
    if (onlineCandidates.length === 0) {
      console.warn(`[MatchingAgent][${traceId}] All candidates are OFFLINE. No assignment possible.`);
      return null;
    }
    if (onlineCandidates.length < candidates.length) {
      console.log(`[MatchingAgent][${traceId}] Filtered ${candidates.length - onlineCandidates.length} OFFLINE driver(s).`);
    }

    try {
      if (options.simulate_tool_error === true) {
        throw new Error('SIMULATED_TOOL_FAILURE'); // TC56/60
      }

      // TC54: Tool Call 1 — Pricing Service
      // Fallback price calculated from config (baseFare + distance * perKmRate), NOT hardcoded
      let ridePrice = AGENT_CONFIG.DEFAULT_BASE_FARE + (rideDistanceKm * AGENT_CONFIG.DEFAULT_PER_KM_RATE);
      let pricingToolCalled = false;
      try {
        const demandIndex = options.demand_index ?? AGENT_CONFIG.DEFAULT_DEMAND_INDEX;
        const priceRes = await axios.post(`${this.pricingUrl}/price`, {
          distance_km: rideDistanceKm,
          demand_index: demandIndex
        }, { timeout: 2000 });
        ridePrice = priceRes.data.data.final_price;
        pricingToolCalled = true;
        console.log(`[MatchingAgent][${traceId}] TC54: Pricing tool called. Price=${ridePrice}`);
      } catch (err: any) {
        // TC56: retry already handled by axiosRetry above — if still fails, use calculated fallback
        console.warn(`[MatchingAgent][${traceId}] TC56: Pricing tool failed after retries. Using calculated fallback price=${ridePrice} (base=${AGENT_CONFIG.DEFAULT_BASE_FARE} + ${rideDistanceKm}km * ${AGENT_CONFIG.DEFAULT_PER_KM_RATE}/km). Error: ${err.message}`);
      }

      // TC51/52/53: Priority-based multi-objective scoring (Thuật toán đa mục tiêu)
      // Giải thích: Mỗi chế độ ưu tiên (speed, quality, balanced) sẽ có bộ trọng số (Weights) khác nhau. 
      // Ví dụ: Quality (TC52) sẽ đặt trọng số Rating cao nhất (0.70) để chọn tài xế 5 sao.
      const priority = options.priority || 'balanced';
      const weights = {
        speed:    { rating: 0.10, eta: 0.70, reliability: 0.20 }, // Ưu tiên gần nhất
        quality:  { rating: 0.70, eta: 0.10, reliability: 0.20 }, // Ưu tiên chất lượng
        balanced: { rating: 0.35, eta: 0.45, reliability: 0.20 }, // Cân bằng cả hai
      }[priority];

      const validResults = onlineCandidates.map(driver => {
        // TC55: Handle missing/null context via safe defaults from AGENT_CONFIG
        const rating  = driver.rating        ?? AGENT_CONFIG.DEFAULT_RATING;
        const eta     = driver.etaMinutes    ?? AGENT_CONFIG.DEFAULT_ETA;
        const accRate = driver.acceptanceRate ?? AGENT_CONFIG.DEFAULT_ACCEPTANCE;
        const rides   = driver.totalRides    ?? AGENT_CONFIG.DEFAULT_RIDES;

        const ratingNorm  = rating / AGENT_CONFIG.MAX_RATING; // Chuẩn hóa Rating (0-1)
        const etaNorm     = Math.max(0, 1 - eta / AGENT_CONFIG.MAX_ETA_NORM); // Chuẩn hóa ETA (ngắn hơn thì điểm cao hơn)
        const reliability = (accRate * 0.6) + (Math.min(rides, AGENT_CONFIG.MAX_RIDES_NORM) / AGENT_CONFIG.MAX_RIDES_NORM) * 0.4;

        // Công thức tính tổng điểm (Scoring Function):
        const score = (ratingNorm * weights.rating) + (etaNorm * weights.eta) + (reliability * weights.reliability);

        // TC53: Price includes ETA surcharge (multi-objective)
        const driverPrice = ridePrice + (eta * 500);

        const reason = `[${priority.toUpperCase()}] Rating=${rating}, ETA=${eta}min, Dist=${driver.distanceKm}km, Price=${(driverPrice/1000).toFixed(1)}k, Reliability=${(reliability*100).toFixed(0)}%`;

        return {
          driverId: driver.driverId,
          metrics: { score: parseFloat(score.toFixed(3)), price: driverPrice, eta },
          reasoning: reason,
        };
      });

      const sorted = validResults.sort((a, b) => b.metrics.score - a.metrics.score);
      const top = sorted[0];

      // TC58: Log full decision with trace_id
      const latencyMs = Date.now() - startTime;
      console.log(JSON.stringify({
        event:      'AGENT_DECISION',
        traceId,
        modelVersion: MODEL_VERSION,
        priority,
        winner:     top.driverId,
        score:      top.metrics.score,
        reasoning:  top.reasoning,
        totalCandidates: onlineCandidates.length,
        pricingToolCalled,
        latencyMs,
        timestamp:  new Date().toISOString(),
      }));

      return {
        ...top,
        traceId,
        topDrivers: sorted.slice(0, 3).map(d => ({
          driverId:  d.driverId,
          score:     d.metrics.score,
          eta:       d.metrics.eta,
          price:     d.metrics.price,
          reasoning: d.reasoning,
        })),
      };

    } catch (error: any) {
      // TC60: Cơ chế Fallback sang Rule-based logic khi AI sập.
      // Giải thích: Nếu service AI hoặc Tool gặp lỗi, hệ thống sẽ tự động chuyển sang thuật toán dự phòng (ai gần nhất thì chọn) để đảm bảo tính sẵn sàng (Availability).
      console.error(`[MatchingAgent][${traceId}] TC60: AI failure, switching to rule-based fallback. Error: ${error.message}`);
      return this.fallbackDecision(onlineCandidates, traceId);
    }
  }

  // TC60: Rule-based fallback (proximity only) — scores computed dynamically, NOT hardcoded
  private fallbackDecision(candidates: DriverFeatures[], traceId?: string): AgentDecision {
    const sorted = [...candidates].sort((a, b) => a.distanceKm - b.distanceKm);
    const best = sorted[0];
    const maxDist = Math.max(...candidates.map(d => d.distanceKm), 1); // avoid div-by-zero

    const top3 = sorted.slice(0, 3).map(d => {
      // Dynamic score: closer driver = higher score (inverse distance normalization)
      const proximityScore = parseFloat((1 - d.distanceKm / (maxDist + 1)).toFixed(3));
      // Dynamic ETA: calculated from distance, NOT a fixed number
      const eta = d.etaMinutes || Math.max(1, Math.ceil(d.distanceKm * AGENT_CONFIG.AVG_SPEED_FACTOR));
      // Dynamic price: baseFare + perKm * distance, NOT fixed 30000
      const price = AGENT_CONFIG.DEFAULT_BASE_FARE + Math.round(d.distanceKm * AGENT_CONFIG.DEFAULT_PER_KM_RATE);
      return {
        driverId:  d.driverId,
        score:     proximityScore,
        eta,
        price,
        reasoning: `FALLBACK: Proximity-based (dist=${d.distanceKm}km, score=${proximityScore})`,
      };
    });

    const bestEta = best.etaMinutes || Math.max(1, Math.ceil(best.distanceKm * AGENT_CONFIG.AVG_SPEED_FACTOR));
    const bestPrice = AGENT_CONFIG.DEFAULT_BASE_FARE + Math.round(best.distanceKm * AGENT_CONFIG.DEFAULT_PER_KM_RATE);
    const bestScore = parseFloat((1 - best.distanceKm / (maxDist + 1)).toFixed(3));

    console.log(JSON.stringify({
      event:     'AGENT_FALLBACK_DECISION',
      traceId:   traceId || 'unknown',
      winner:    best.driverId,
      score:     bestScore,
      eta:       bestEta,
      price:     bestPrice,
      reason:    'Rule-based fallback due to AI failure',
      config:    { baseFare: AGENT_CONFIG.DEFAULT_BASE_FARE, perKm: AGENT_CONFIG.DEFAULT_PER_KM_RATE },
      timestamp: new Date().toISOString(),
    }));

    return {
      driverId:  best.driverId,
      traceId,
      metrics:   { score: bestScore, price: bestPrice, eta: bestEta },
      reasoning: `FALLBACK: Selection based on proximity only (Agent Tool Failure). Dist=${best.distanceKm}km, ETA=${bestEta}min.`,
      topDrivers: top3,
    };
  }
}
