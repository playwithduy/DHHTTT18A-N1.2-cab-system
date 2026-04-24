import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => console.error('[driver-service] Redis Error:', err));
redis.connect().then(() => console.log(`[driver-service] Connected to Redis for Geo at ${REDIS_URL}`)).catch(err => console.error('[driver-service] Redis connection failed', err));

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const driverId = req.body.driverId || req.body.driver_id;
    const { status, location, rating, acceptance_rate, total_rides, vehicle_type } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: 'driverId is required' });
    }

    // Case 3: Driver must exist in DB — no auto-creation allowed
    const existing = await prisma.driver.findUnique({ where: { userId: driverId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
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

    // Sync to Redis for AI Matching (Requirement 23)
    if (status === 'ONLINE' && location?.lat && location?.lng) {
      await redis.geoAdd('drivers:geo', {
        longitude: location.lng,
        latitude:  location.lat,
        member:    driverId
      });
      // Also store features for scoring (No longer hardcoded!)
      await redis.hSet(`driver:${driverId}:features`, {
        rating:         driver.rating.toString(),
        acceptanceRate: driver.acceptanceRate.toString(),
        totalRides:     driver.totalRides.toString(),
        vehicleType:    driver.vehicleType
      });
      // Also store location as hash for AI matcher (Compatibility)
      await redis.hSet(`driver:${driverId}:location`, {
        lat: location.lat.toString(),
        lng: location.lng.toString()
      });
    } else if (status === 'OFFLINE') {
      await redis.zRem('drivers:geo', driverId);
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

// ── Configurable Driver Parameters (NOT hardcoded) ──────────────
const DRIVER_CONFIG = {
  DEFAULT_LAT:      parseFloat(process.env.DEFAULT_CENTER_LAT || '10.76'),   // HCMC center
  DEFAULT_LNG:      parseFloat(process.env.DEFAULT_CENTER_LNG || '106.66'),  // HCMC center
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
