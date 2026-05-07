import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => console.error('[driver-service] Lỗi Redis:', err));
redis.connect().then(() => console.log(`[driver-service] Đã kết nối Redis cho dữ liệu địa lý tại ${REDIS_URL}`)).catch(err => console.error('[driver-service] Kết nối Redis thất bại', err));

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const driverId = req.body.driverId || req.body.driver_id;
    const { status, location, rating, acceptance_rate, total_rides, vehicle_type } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Yêu cầu driverId' });
    }

    // Trường hợp 3: Người hỗ trợ phải có sẵn trong dữ liệu — không được phép tự động tạo mới khi đang cập nhật trạng thái
    const existing = await prisma.driver.findUnique({ where: { userId: driverId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
    }

    const updateData: any = { status };
    if (location?.lat !== undefined) updateData.currentLat = location.lat;
    if (location?.lng !== undefined) updateData.currentLng = location.lng;
    if (rating !== undefined) updateData.rating = parseFloat(rating);
    if (acceptance_rate !== undefined) updateData.acceptanceRate = parseFloat(acceptance_rate);
    if (total_rides !== undefined) updateData.totalRides = parseInt(total_rides);
    if (vehicle_type !== undefined) updateData.vehicleType = vehicle_type;

    const driver = await prisma.driver.update({
      where: { userId: driverId },
      data: updateData,
    });

    // Đồng bộ dữ liệu sang Redis để phục vụ việc tìm kiếm thông minh
    // TC5: Tài xế chuyển sang ONLINE
    if (status === 'ONLINE' && location?.lat && location?.lng) {
      await redis.geoAdd('drivers:geo', {
        longitude: location.lng,
        latitude: location.lat,
        member: driverId
      });
      // Lưu trữ thêm các đặc điểm để tính điểm (Dữ liệu linh hoạt, không còn bị cố định!)
      await redis.hSet(`driver:${driverId}:features`, {
        rating: driver.rating.toString(),
        acceptanceRate: driver.acceptanceRate.toString(),
        totalRides: driver.totalRides.toString(),
        vehicleType: driver.vehicleType
      });
      // Lưu trữ vị trí dưới dạng mã băm để tương thích với bộ phận tìm kiếm
      await redis.hSet(`driver:${driverId}:location`, {
        lat: location.lat.toString(),
        lng: location.lng.toString()
      });
      // [TC-05] [Level 05]: Đồng bộ hóa vị trí và trạng thái sẵn sàng của người hỗ trợ (ONLINE).
    } else if (status === 'OFFLINE') {
      // TC57: Tài xế chuyển sang OFFLINE 
      await redis.zRem('drivers:geo', driverId);
      // [TC-57] [Level 57]: Tự động loại bỏ người hỗ trợ khỏi danh sách tìm kiếm (OFFLINE).
    }

    res.status(200).json({
      success: true,
      message: `Trạng thái tài xế cập nhật thành ${status}`,
      data: driver,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Các tham số cấu hình linh hoạt (Không bị cố định trong code) ──────────────
const DRIVER_CONFIG = {
  DEFAULT_LAT: parseFloat(process.env.DEFAULT_CENTER_LAT || '10.76'),   // HCMC center
  DEFAULT_LNG: parseFloat(process.env.DEFAULT_CENTER_LNG || '106.66'),  // HCMC center
  SEARCH_RADIUS_KM: parseInt(process.env.SEARCH_RADIUS_KM || '50'),
};

export const getOnlineDrivers = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    let drivers = await prisma.driver.findMany({
      where: { status: 'ONLINE' },
    });

    if (!isNaN(lat) && !isNaN(lng)) {
      drivers = drivers.filter(dr => {
        const cLat = dr.currentLat || DRIVER_CONFIG.DEFAULT_LAT;
        const cLng = dr.currentLng || DRIVER_CONFIG.DEFAULT_LNG;
        const dLat = (cLat - lat) * (Math.PI / 180);
        const dLng = (cLng - lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(cLat * (Math.PI / 180)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = 6371 * c;
        return distanceKm <= DRIVER_CONFIG.SEARCH_RADIUS_KM;
      });
    }

    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerDriver = async (req: Request, res: Response) => {
  try {
    const { driverId, vehicleModel, vehiclePlate, vehicleType } = req.body;
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Yêu cầu driverId' });
    }

    const existing = await prisma.driver.findUnique({ where: { userId: driverId } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tài xế đã tồn tại' });
    }

    const driver = await prisma.driver.create({
      data: {
        userId: driverId,
        vehicleModel: vehicleModel || 'Unknown',
        vehiclePlate: vehiclePlate || 'Unknown',
        vehicleType: vehicleType || 'car',
        status: 'OFFLINE',
      }
    });

    res.status(201).json({ success: true, message: 'Đã tạo hồ sơ tài xế', data: driver });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
