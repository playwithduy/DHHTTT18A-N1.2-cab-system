// Dịch vụ Tính giá — Tính toán mức phí và điều chỉnh linh hoạt
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const MODEL_VERSION = process.env.PRICING_MODEL_VERSION || 'v2.1.0-surge';

// ── Các tham số cấu hình mức phí (Đọc từ môi trường, không bị cố định) ─────
const MAX_SURGE_CAP = parseFloat(process.env.MAX_SURGE_CAP || '3.0');
const MAX_DISTANCE_KM = parseInt(process.env.MAX_DISTANCE_KM || '1000');

const VEHICLE_PRICING: Record<string, { baseFare: number; perKmRate: number }> = {
  bike:    { baseFare: parseInt(process.env.BIKE_BASE_FARE || '13000'),    perKmRate: parseInt(process.env.BIKE_PER_KM || '4500')  },
  car:     { baseFare: parseInt(process.env.CAR_BASE_FARE || '28000'),     perKmRate: parseInt(process.env.CAR_PER_KM || '11000') },
  premium: { baseFare: parseInt(process.env.PREMIUM_BASE_FARE || '35000'), perKmRate: parseInt(process.env.PREMIUM_PER_KM || '14500') },
  xl:      { baseFare: parseInt(process.env.XL_BASE_FARE || '32000'),      perKmRate: parseInt(process.env.XL_PER_KM || '13000') },
};

function calculateFare(distance_km: number, demand_index: number, supply_index: number, vehicle_type: string) {
  const demand = Math.max(0, demand_index);
  if (demand_index === 0) {
    // [TC-16] [Level 16]: Duy trì một mức phí sàn cố định để đảm bảo quyền lợi tối thiểu cho người hỗ trợ.
  }
  // Quy tắc tính toán mức đóng góp linh hoạt:
  // 1. Phân tích sự cân bằng: Lấy mức độ người cần dịch vụ (demand) chia cho số lượng người hỗ trợ sẵn sàng (supply).
  // 2. Xử lý tình huống đặc biệt: Nếu không có người hỗ trợ, hệ thống tự động gán một giá trị nhỏ nhất để tránh lỗi chia cho 0.
  const supply = Math.max(0.1, supply_index);
  
  // 3. Cơ chế điều chỉnh (Surge): 
  // - Nếu nhu cầu cao hơn nguồn cung, hệ thống sẽ tự động nhân thêm một hệ số để khuyến khích nhiều người hỗ trợ tham gia vào khu vực đó.
  // - Hệ số này luôn tối thiểu là 1.0 (không giảm giá dưới mức cơ bản khi nhu cầu thấp).
  let surge = demand / supply;
  if (surge < 1.0 || isNaN(surge)) surge = 1.0;
  if (surge > MAX_SURGE_CAP) {
    // 4. Cơ chế bảo vệ người dùng: Giới hạn hệ số nhân ở một mức tối đa (ví dụ 3.0) để đảm bảo chi phí không vượt quá khả năng chi trả ngay cả khi cực kỳ khan hiếm người hỗ trợ.
    // [TC-42] [Level 42]: Tự động điều chỉnh mức đóng góp theo cơ chế linh hoạt khi nhu cầu sử dụng tại một khu vực tăng đột biến.
    surge = MAX_SURGE_CAP; // Configurable max surge cap
  }

  const pricing = VEHICLE_PRICING[vehicle_type] ?? VEHICLE_PRICING['car'];
  const { baseFare, perKmRate } = pricing;

  // 5. Cấu trúc chi phí theo quãng đường:
  // - Giai đoạn khởi đầu (Dưới 2km): Áp dụng mức phí mở cửa cố định để đảm bảo chi phí vận hành cho những chuyến đi ngắn.
  // - Giai đoạn di chuyển dài (Trên 2km): Tính theo công thức: Phí mở cửa + (Số km vượt dư * Đơn giá mỗi km tiếp theo).
  // 6. Tổng kết: Toàn bộ số tiền cuối cùng sẽ được nhân với hệ số điều chỉnh linh hoạt (Surge) đã tính ở trên.
  let fare: number;
  if (distance_km <= 2) {
    fare = baseFare * surge;
  } else {
    fare = (baseFare + (distance_km - 2) * perKmRate) * surge;
  }

  return { fare: Math.round(fare), surge, baseFare, perKmRate };
}

app.post(['/', '/price', '/pricing'], (req, res) => {
  const { distance_km, demand_index = 1.0, supply_index = 1.0, vehicle_type = 'car', simulate_timeout = false } = req.body;
  
  if (simulate_timeout === true) {
    console.log('[pricing-service] Đang giả lập hết thời gian chờ (timeout)...');
    return; 
  }

  if (distance_km === undefined) return res.status(400).json({ success: false, message: 'Yêu cầu distance_km' });

  // Case 50: Abnormal Input (distance > configurable max)
  if (distance_km > MAX_DISTANCE_KM) {
    // [TC-50] [Level 50]: Hệ thống tự động nhận diện và từ chối các yêu cầu có thông số bất thường như quãng đường quá dài.
    return res.status(400).json({ success: false, message: 'Khoảng cách vượt quá giới hạn hoạt động', modelVersion: MODEL_VERSION });
  }

  const result = calculateFare(distance_km, demand_index, supply_index, vehicle_type);
  
  console.log(`\x1b[35m[PRICING]\x1b[0m Calc: Dist=${distance_km}km, Type=${vehicle_type}, Surge=${result.surge.toFixed(2)}x -> \x1b[32m${result.fare}đ\x1b[0m`);

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

const VEHICLE_DISPLAY_INFO: Record<string, { name: string; icon: string }> = {
  bike:    { name: 'CabGo Bike',    icon: 'Bike' },
  car:     { name: 'CabGo Car',     icon: 'Car'  },
  premium: { name: 'CabGo Premium', icon: 'Star' },
  xl:      { name: 'CabGo XL',      icon: 'Grid' },
};

app.get('/vehicles', (_req, res) => {
  const vehicles = Object.entries(VEHICLE_PRICING).map(([type, pricing]) => {
    const info = VEHICLE_DISPLAY_INFO[type] || { name: `CabGo ${type.toUpperCase()}`, icon: 'Car' };
    return {
      type,
      name: info.name,
      base_fare: pricing.baseFare,
      per_km_rate: pricing.perKmRate,
      icon: info.icon
    };
  });
  res.json({ success: true, data: vehicles });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'pricing-service', version: MODEL_VERSION }));

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`[pricing-service] Running on port ${PORT}`));
