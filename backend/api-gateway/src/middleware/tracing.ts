import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Trích xuất mã vết (trace ID) hiện có nếu có, nếu không sẽ tạo mới (Mục 115)
  const traceId = req.headers['x-trace-id'] || uuidv4();
  
  // Đính kèm vào yêu cầu để các bộ phận phía sau có thể nhận diện
  (req as any).traceId = traceId;
  res.setHeader('x-trace-id', traceId as string);

  // Nhật ký có cấu trúc (Mục 112)
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
