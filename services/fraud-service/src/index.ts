// ============================================================
// Fraud Service — Minimal Mock for Level 5
// ============================================================
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const MODEL_VERSION = 'v1.0.5-fraud';

const fraudCheckSchema = z.object({
  user_id: z.string().optional(),
  driver_id: z.string().optional(),
  booking_id: z.string().optional(),
  amount: z.number().positive().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

app.post(['/', '/fraud', '/check', '/fraud/check'], async (req: Request, res: Response) => {
  try {
    const data = fraudCheckSchema.parse(req.body);
    
    // Case 43: Fraud detection logic
    // Logic: amount > 10M VND or specific mock trigger
    const isFraud = data.amount > 10000000 || (req.body.simulate_fraud === true);

    res.json({
      success: true,
      data: {
        is_fraud: isFraud,
        isFraud: isFraud, // Helper for different test expectations
        score: isFraud ? 0.99 : 0.05, // Case 43: score > threshold
        risk_level: isFraud ? 'HIGH' : 'LOW',
        modelVersion: MODEL_VERSION // Case 46
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'missing required fields',
        errors: error.issues.map(e => ({ field: e.path[0], message: e.message }))
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', service: 'fraud-service', version: MODEL_VERSION }));

const PORT = 3009;
app.listen(PORT, () => console.log(`[fraud-service] Running on port ${PORT}`));
