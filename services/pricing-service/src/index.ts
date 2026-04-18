// ============================================================
// Pricing Service — Fare Calculation & Surge Pricing
// ============================================================
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const MODEL_VERSION = 'v2.1.0-surge';

const VEHICLE_PRICING: Record<string, { baseFare: number; perKmRate: number }> = {
  bike:    { baseFare: 13000, perKmRate: 4500  },
  car:     { baseFare: 28000, perKmRate: 11000 },
  premium: { baseFare: 35000, perKmRate: 14500 },
  xl:      { baseFare: 32000, perKmRate: 13000 },
};

function calculateFare(distance_km: number, demand_index: number, supply_index: number, vehicle_type: string) {
  const demand = Math.max(0, demand_index);
  const supply = Math.max(0.1, supply_index);
  
  // Case 42: Pricing model surge logic
  let surge = demand / supply;
  if (surge < 1.0) surge = 1.0;
  if (surge > 3.0) surge = 3.0; // Max surge cap for Case 42

  const pricing = VEHICLE_PRICING[vehicle_type] ?? VEHICLE_PRICING['car'];
  const { baseFare, perKmRate } = pricing;

  let fare: number;
  if (distance_km <= 2) {
    fare = baseFare * surge;
  } else {
    fare = (baseFare + (distance_km - 2) * perKmRate) * surge;
  }

  return { fare: Math.round(fare), surge, baseFare, perKmRate };
}

app.post(['/price', '/pricing'], (req, res) => {
  const { distance_km, demand_index = 1.0, supply_index = 1.0, vehicle_type = 'car', simulate_timeout = false } = req.body;
  
  if (simulate_timeout === true) {
    console.log('[pricing-service] Simulating timeout...');
    return; 
  }

  if (distance_km === undefined) return res.status(400).json({ success: false, message: 'distance_km is required' });

  // Case 50: Abnormal Input (distance > 1000km)
  if (distance_km > 1000) {
    return res.status(400).json({ success: false, message: 'Distance exceeds operational limit', modelVersion: MODEL_VERSION });
  }

  const result = calculateFare(distance_km, demand_index, supply_index, vehicle_type);
  res.json({
    success: true,
    data: {
      base_fare: result.baseFare,
      per_km_rate: result.perKmRate,
      vehicle_type,
      distance_km,
      surge_multiplier: parseFloat(result.surge.toFixed(2)),
      final_price: result.fare,
      currency: 'VND',
      modelVersion: MODEL_VERSION // Case 46
    }
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'pricing-service', version: MODEL_VERSION }));

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`[pricing-service] Running on port ${PORT}`));
