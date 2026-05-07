// Dịch vụ Thông báo — Giả lập tin nhắn SMS và thông báo đẩy
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { Kafka } from 'kafkajs';

const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'kafka:9092';
console.log(`[notification-service] Đang kết nối Kafka tại: ${KAFKA_BROKERS}`);
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: KAFKA_BROKERS.split(','),
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

let kafkaStatus = 'initializing';
const logs: any[] = [];

const startKafka = async () => {
  let connected = false;
  while (!connected) {
    try {
      await consumer.connect();
      kafkaStatus = 'connected';
      console.log('\x1b[32m%s\x1b[0m', '[notification-service] Đã kết nối Kafka thành công');
      await consumer.subscribe({ topics: ['ride_events', 'driver.assigned'], fromBeginning: false });
      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            const data = JSON.parse(message.value?.toString() || '{}');
            // [TC-26] [Level 26]: Lắng nghe và tiếp nhận các luồng thông tin từ hệ thống truyền dẫn trung tâm (Kafka).
            console.log(`[notification] Received message on topic ${topic}:`, data);
            
            if (topic === 'ride_events' && data.event_type === 'ride_requested') {
              console.log(`[Thông báo] Có yêu cầu đặt xe mới! Đang thông báo cho các người hỗ trợ xung quanh về hành trình ${data.booking_id}...`);
              logs.unshift({ type: 'notify_drivers', ...data, source: 'kafka', timestamp: new Date().toISOString() });
            } else if (topic === 'ride_events' && data.event_type === 'ride_accepted') {
              console.log(`[Thông báo] Hành trình ${data.booking_id} đã được TIẾP NHẬN bởi người hỗ trợ ${data.driver_id}. Đang thông báo cho người dùng...`);
              logs.unshift({ type: 'notify_user', ...data, source: 'kafka', timestamp: new Date().toISOString() });
            } else if (topic === 'driver.assigned') {
              console.log(`[Thông báo] Người hỗ trợ ${data.driverId} đã được chỉ định cho hành trình ${data.bookingId}. Đang thông báo cho người dùng...`);
              logs.unshift({ type: 'driver_assigned', ...data, source: 'kafka', timestamp: new Date().toISOString() });
            }
            if (logs.length > 100) logs.length = 100;
          } catch (err: any) {
            console.error('[notification] Error processing message:', err.message);
          }
        },
      });
      connected = true;
    } catch (err: any) {
      kafkaStatus = 'error: ' + err.message;
      console.error('[notification] Kết nối Kafka thất bại. Thử lại sau 5 giây...', err.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

startKafka().catch(err => console.error('[notification] Kafka Error:', err));

const app = express();
app.use(helmet());

app.use(morgan('dev'));
app.use(express.json());

// POST /notify
// Thực hiện gửi thông báo giả lập
app.post('/notifications', (req, res) => {
  // Alias for Test 9
  const { user_id, message } = req.body;
  if (!user_id || !message) return res.status(400).json({ success: false, message: 'Missing user_id or message' });

  // [TC-09] [Level 09]: Thực hiện quy trình gửi thông báo trực tiếp đến thiết bị của người dùng.
  console.log(`[notification] Sent manually to ${user_id}: ${message}`);
  res.json({ success: true, message: 'Notification sent', data: { user_id, message, timestamp: new Date().toISOString() } });
});

app.post('/notify', (req, res) => {
  const { user_id, message, type = 'push' } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ success: false, message: 'user_id and message are required' });
  }

  // Giả lập: Chờ 100ms (để kiểm tra độ trễ tương đương hết thời gian chờ trong Bài kiểm tra 9)
  setTimeout(() => {
    console.log(`[notification] Sent ${type} to ${user_id}: "${message}"`);
    res.json({
      success: true,
      data: {
        user_id,
        message,
        status: 'sent',
        id: `ntf_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }
    });
  }, 100);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service', kafka: kafkaStatus }));

app.get('/kafka-health', (_req, res) => res.json({ status: kafkaStatus }));

app.post('/internal/force-log', (req, res) => {
  const { type, data } = req.body;
  logs.unshift({ type, ...data, source: 'http_fallback', timestamp: new Date().toISOString() });
  if (logs.length > 100) logs.length = 100;
  res.json({ success: true });
});

app.get('/notifications/logs', (_req, res) => res.json({ success: true, data: logs }));

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`[notification-service] Running on port ${PORT}`));
