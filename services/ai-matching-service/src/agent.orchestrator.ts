import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configure retry (Scenario 56)
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => error.code === 'ECONNABORTED' || axiosRetry.isNetworkOrIdempotentRequestError(error)
});

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
  metrics: {
    score: number;
    price: number;
    eta: number;
  };
}

export class MatchingAgent {
  private pricingUrl = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3006';

  async selectBestDriver(
    candidates: DriverFeatures[], 
    rideDistanceKm: number = 5,
    options: {
        simulate_tool_error?: boolean;
        priority?: 'speed' | 'quality' | 'balanced',
        traceId?: string
    } = {}
  ): Promise<AgentDecision | null> {
    const startTime = Date.now();
    const MODEL_VERSION = 'v1.2.0'; // Step 118
    if (candidates.length === 0) return null;

    try {
      // Scenario 54: Tool Calling - Price Calculation
      let ridePrice = 30000;
      
      if (options.simulate_tool_error === true) {
        throw new Error('SIMULATED_TOOL_FAILURE'); // Scenario 56/60
      }

      try {
        const priceRes = await axios.post(`${this.pricingUrl}/price`, { 
          distance_km: rideDistanceKm,
          demand_index: 1.2
        }, { timeout: 2000 });
        ridePrice = priceRes.data.data.final_price;
      } catch (err: any) {
        console.warn(`[MatchingAgent] Pricing tool error: ${err.message}. Using default.`);
      }

      // Scenario 51, 52, 53: Advanced Decision weights
      const priority = options.priority || 'balanced';
      const weights = {
          speed:   { rating: 0.1, eta: 0.7, reliability: 0.2 },
          quality: { rating: 0.7, eta: 0.1, reliability: 0.2 },
          balanced: { rating: 0.35, eta: 0.45, reliability: 0.20 }
      }[priority];

      const validResults = candidates.map(driver => {
        // Scenario 55: Handle Missing/Null Context via defaults
        const rating   = driver.rating ?? 4.5;
        const eta      = driver.etaMinutes ?? 10;
        const accRate  = driver.acceptanceRate ?? 0.8;
        const rides    = driver.totalRides ?? 50;

        const ratingNorm   = rating / 5;
        const etaNorm      = Math.max(0, 1 - eta / 20);
        const reliability  = (accRate * 0.6) + (Math.min(rides, 500) / 500) * 0.4;
        
        const score = (ratingNorm * weights.rating) + (etaNorm * weights.eta) + (reliability * weights.reliability);
        
        return {
          driverId: driver.driverId,
          metrics: { score: parseFloat(score.toFixed(3)), price: ridePrice, eta },
          reasoning: `[${priority.toUpperCase()}] Rating ${rating}, ETA ${eta}m, Reliability ${(reliability*100).toFixed(0)}%.`
        };
      });

      const sorted = validResults.sort((a, b) => b.metrics.score - a.metrics.score);
      const top = sorted[0];

      // Scenario 58: Log Decision fully
      console.log(`[MatchingAgent] Decision: ${top.driverId} (Score: ${top.metrics.score}). Reasoning: ${top.reasoning}`);
      return top;

    } catch (error: any) {
      console.error('[MatchingAgent] Failure, falling back to rule-based logic:', error.message);
      return this.fallbackDecision(candidates); // Scenario 60
    }
  }

  // Scenario 60: Fallback rule-based logic
  private fallbackDecision(candidates: DriverFeatures[]): AgentDecision {
    const sorted = candidates.sort((a, b) => a.distanceKm - b.distanceKm); 
    const best = sorted[0];
    return {
      driverId: best.driverId,
      metrics: { score: 0.5, price: 30000, eta: best.etaMinutes || 5 },
      reasoning: 'FALLBACK: Selection based on proximity only (Agent Tool Failure).'
    };
  }
}
