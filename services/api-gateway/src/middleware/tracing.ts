import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract existing trace ID if available, otherwise create a new one (Item 115)
  const traceId = req.headers['x-trace-id'] || uuidv4();
  
  // Attach it to the request so proxy downstream can pick it up
  (req as any).traceId = traceId;
  res.setHeader('x-trace-id', traceId as string);

  // Structured Logging (Item 112)
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service_name: 'api-gateway',
    level: 'INFO',
    trace_id: traceId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress
  }));

  next();
};
