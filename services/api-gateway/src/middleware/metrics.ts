import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Initialize default node metrics (CPU, Memory Event Loop, etc - Item 120)
client.collectDefaultMetrics({ prefix: 'cabgo_gateway_' });

export const httpRequestCounter = new client.Counter({
  name: 'cabgo_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpLatencyHistogram = new client.Histogram({
  name: 'cabgo_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds (Item 113)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 3] // latency buckets in s
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics') {
    return next();
  }
  
  const end = httpLatencyHistogram.startTimer();
  res.on('finish', () => {
    const duration = end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode.toString() });
    httpRequestCounter.labels(req.method, req.route ? req.route.path : req.path, res.statusCode.toString()).inc();

    // Step 116, 117: Simulated Alerting
    if (duration > 0.5) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ALERT',
        type: 'LATENCY_SPIKE',
        message: `High latency detected: ${duration.toFixed(3)}s on ${req.method} ${req.path}`,
        trace_id: (req as any).traceId
      }));
    }
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ALERT',
        type: 'ERROR_THRESHOLD',
        message: `Service error detected: ${res.statusCode} on ${req.method} ${req.path}`,
        trace_id: (req as any).traceId
      }));
    }
  });

  next();
};

export const getMetrics = async (req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
};
