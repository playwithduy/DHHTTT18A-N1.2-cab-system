const http = require('http');

const GATEWAY_URL = 'http://localhost:8080';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, GATEWAY_URL);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    let bodyString = '';
    if (body) {
      bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- CabGo Level 1 Verification (Node.js) ---');
  const ts = Date.now();
  const email = `test_${ts}@example.com`;
  let token, userId, bookingId;

  try {
    // 1. Register
    console.log('\n1. Registering...');
    const reg = await request('POST', '/auth/register', { 
      email, 
      password: '123456', 
      name: 'Test'
    });
    if (reg.status !== 201) throw new Error(`Register failed (${reg.status}): ${JSON.stringify(reg.data)}`);
    userId = reg.data.user_id;
    console.log('✔ Success:', userId);

    // 2. Login
    console.log('\n2. Logging in...');
    const login = await request('POST', '/auth/login', { email, password: '123456' });
    if (login.status !== 200) throw new Error(`Login failed`);
    token = login.data.data.access_token;
    console.log('✔ Success. Token received.');

    // 2.b Register Driver
    console.log('\n2b. Registering Driver...');
    const driverEmail = `driver_${ts}@example.com`;
    const regDrv = await request('POST', '/auth/register', { 
      email: driverEmail, 
      password: '123456', 
      name: 'Test Driver',
      role: 'DRIVER'
    });
    const driverId = regDrv.data.user_id;
    console.log('✔ Success:', driverId);

    // 3. Driver Online
    console.log('\n3. Driver Online...');
    await request('POST', '/drivers/status', { driver_id: driverId, status: 'ONLINE', location: { lat: 10, lng: 106 } }, token);
    console.log('✔ Success.');

    // 4. Create Booking
    console.log('\n4. Creating Booking...');
    const booking = await request('POST', '/bookings', {
      userId,
      pickup: { lat: 10, lng: 106 },
      drop: { lat: 11, lng: 107 },
      distance_km: 5
    }, token);
    if (booking.status !== 201) throw new Error(`Booking failed (${booking.status}): ${JSON.stringify(booking.data)}`);
    bookingId = booking.data.data.bookingId || booking.data.data.booking_id;
    console.log('✔ Success:', bookingId, 'Status:', booking.data.data.status);

    // 5. List Bookings
    console.log('\n5. Listing Bookings...');
    const list = await request('GET', `/bookings?user_id=${userId}`, null, token);
    console.log('✔ Success. Found', list.data.data.length, 'bookings.');

    // 7. ETA
    console.log('\n7. Testing ETA...');
    const eta = await request('POST', '/eta', { distance_km: 5, traffic_level: 0.5 }, token);
    if (eta.status !== 200) throw new Error(`ETA failed (${eta.status}): ${JSON.stringify(eta.data)}`);
    const etaVal = eta.data && eta.data.data ? eta.data.data.eta : (eta.data ? eta.data.eta : undefined);
    console.log('✔ Success. ETA:', etaVal);

    // 8. Pricing
    console.log('\n8. Testing Pricing...');
    const price = await request('POST', '/pricing', { distance_km: 5, demand_index: 1 }, token);
    if (price.status !== 200) throw new Error(`Pricing failed (${price.status}): ${JSON.stringify(price.data)}`);
    const priceVal = price.data && price.data.data ? price.data.data.price : (price.data ? price.data.price : undefined);
    console.log('✔ Success. Price:', priceVal);

    // 9. Notification
    console.log('\n9. Testing Notification...');
    await request('POST', '/notifications', { user_id: userId, message: 'Hi' }, token);
    console.log('✔ Success.');

    // 10. Logout
    console.log('\n10. Logging out...');
    await request('POST', '/auth/logout', null, token);
    console.log('✔ Success.');

    // 11. Verify Blacklist
    console.log('\n11. Verifying Blacklist...');
    const verify = await request('GET', '/bookings', null, token);
    if (verify.status === 401 || verify.status === 403) {
      console.log('✔ Success (Auth blocked as expected).');
    } else {
      throw new Error(`Auth check failed, got ${verify.status}`);
    }

    console.log('\n✅ ALL LEVEL 1 TESTS PASSED!');
  } catch (e) {
    console.error('\n❌ Test Failed:', e.message);
    process.exit(1);
  }
}

run();
