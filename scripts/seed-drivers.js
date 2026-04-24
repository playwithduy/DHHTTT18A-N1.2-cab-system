/**
 * Seed Script — 3 Test Drivers for Level 6 AI Testcases
 * TC51: D1=5km, D2=2km, D3=3km from pickup (10.76, 106.66)
 * TC52: different ratings to test quality priority
 * 
 * Run inside docker: docker compose exec driver-service node /app/scripts/seed-drivers.js
 * Or run locally:    node scripts/seed-drivers.js
 */
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DB_URL    = process.env.DATABASE_URL;

// Pickup reference: lat=10.76, lng=106.66
// 1 degree lat ≈ 111km, 1 degree lng at lat=10.76 ≈ 109km
const PICKUP_LAT = 10.76;
const PICKUP_LNG = 106.66;

// Calculate offset for target distance (lat direction)
const latOffset = (km) => km / 111;

const DRIVERS = [
  {
    userId:        'DRV001',
    vehicleModel:  'Toyota Vios',
    vehiclePlate:  '51A-001',
    status:        'ONLINE',
    currentLat:    PICKUP_LAT + latOffset(5),   // ~5km north
    currentLng:    PICKUP_LNG,
    rating:        4.5,
    acceptanceRate: 0.9,
    totalRides:    500,
    vehicleType:   'car',
  },
  {
    userId:        'DRV002',
    vehicleModel:  'Honda City',
    vehiclePlate:  '51B-002',
    status:        'ONLINE',
    currentLat:    PICKUP_LAT + latOffset(2),   // ~2km north
    currentLng:    PICKUP_LNG,
    rating:        4.9,
    acceptanceRate: 0.95,
    totalRides:    1200,
    vehicleType:   'car',
  },
  {
    userId:        'DRV003',
    vehicleModel:  'Kia Morning',
    vehiclePlate:  '51C-003',
    status:        'ONLINE',
    currentLat:    PICKUP_LAT + latOffset(3),   // ~3km north
    currentLng:    PICKUP_LNG,
    rating:        4.0,
    acceptanceRate: 0.85,
    totalRides:    300,
    vehicleType:   'car',
  },
  {
    userId:        'DRV_LV3_PM',
    vehicleModel:  'Level 3 Toyota',
    vehiclePlate:  '51L-003',
    status:        'ONLINE',
    currentLat:    PICKUP_LAT,
    currentLng:    PICKUP_LNG,
    rating:        4.5,
    acceptanceRate: 0.9,
    totalRides:    100,
    vehicleType:   'car',
  },
  {
    userId:        'DRV_TEST_789',
    vehicleModel:  'Level 3 Honda',
    vehiclePlate:  '51L-789',
    status:        'ONLINE',
    currentLat:    PICKUP_LAT,
    currentLng:    PICKUP_LNG,
    rating:        5.0,
    acceptanceRate: 1.0,
    totalRides:    999,
    vehicleType:   'car',
  },
];

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const redis  = createClient({ url: REDIS_URL });

  try {
    await redis.connect();
    console.log('[seed] Redis connected');

    for (const d of DRIVERS) {
      // 1. Upsert into PostgreSQL
      const driver = await prisma.driver.upsert({
        where:  { userId: d.userId },
        update: {
          status:        d.status,
          currentLat:    d.currentLat,
          currentLng:    d.currentLng,
          rating:        d.rating,
          acceptanceRate: d.acceptanceRate,
          totalRides:    d.totalRides,
          vehicleType:   d.vehicleType,
          vehicleModel:  d.vehicleModel,
          vehiclePlate:  d.vehiclePlate,
        },
        create: d,
      });
      console.log(`[seed] Upserted DB driver: ${d.userId} (${d.currentLat.toFixed(4)}, ${d.currentLng})`);

      // 2. Add to Redis GEO index
      await redis.geoAdd('drivers:geo', {
        longitude: d.currentLng,
        latitude:  d.currentLat,
        member:    d.userId,
      });

      // 3. Store feature hash for AI scoring
      await redis.hSet(`driver:${d.userId}:features`, {
        rating:         d.rating.toString(),
        acceptanceRate: d.acceptanceRate.toString(),
        totalRides:     d.totalRides.toString(),
        vehicleType:    d.vehicleType,
        status:         'ONLINE',
      });

      // 4. Store location hash
      await redis.hSet(`driver:${d.userId}:location`, {
        lat: d.currentLat.toString(),
        lng: d.currentLng.toString(),
      });

      console.log(`[seed] Synced Redis: ${d.userId}`);
    }

    console.log('\n✅ Seed complete! Drivers in DB + Redis:');
    console.log('  DRV001 — 5km, rating 4.5 (ONLINE)');
    console.log('  DRV002 — 2km, rating 4.9 (ONLINE)');
    console.log('  DRV003 — 3km, rating 4.0 (ONLINE)');

  } catch (err) {
    console.error('[seed] Error:', err.message);
    process.exit(1);
  } finally {
    await redis.disconnect();
    await prisma.$disconnect();
  }
}

main();
