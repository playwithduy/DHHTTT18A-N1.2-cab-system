import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'cabgo_ai_' });

export const httpLatencyHistogram = new client.Histogram({
  name: 'cabgo_ai_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds (Item 113)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 3]
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics') {
    return next();
  }
  
  const traceId = req.headers['x-trace-id'] || 'no-trace-id';
  res.setHeader('x-trace-id', traceId);
  (req as any).traceId = traceId;

  const end = httpLatencyHistogram.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode.toString() });
  });

  next();
};

export const getMetrics = async (req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
};
