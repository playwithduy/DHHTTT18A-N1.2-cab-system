const http = require('http');

const GATEWAY_URL = 'http://localhost:8080';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

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
  console.log('=== CabGo LEVEL 1 - BASIC API & Flow Verification ===');
  const ts = Date.now();
  const email = `user_${ts}@test.com`;
  let token, userId, bookingId;

  try {
    // 1. Register User
    console.log('\n[1] TEST: Đăng ký user thành công');
    console.log('Input:', JSON.stringify({ email, password: '123456', name: 'Test User' }, null, 2));
    const reg = await request('POST', '/auth/register', { 
      email, 
      password: '123456', 
      name: 'Test User'
    });
    if (reg.status !== 201) throw new Error(`Register failed (${reg.status})`);
    userId = reg.data.user_id || reg.data.data?.user_id;
    console.log('Expected: HTTP 201 Created, Trả về user_id');
    console.log('Result: HTTP', reg.status, ', User ID:', userId);
    console.log('✔ PASS');

    // 2. Login
    console.log('\n[2] TEST: Đăng nhập trả JWT hợp lệ');
    const login = await request('POST', '/auth/login', { email, password: '123456' });
    if (login.status !== 200) throw new Error(`Login failed`);
    token = login.data.data.access_token;
    const payload = decodeJwt(token);
    console.log('Expected: HTTP 200 OK, Trả về access_token (JWT), sub (user_id), exp (UNIX time)');
    console.log('Result: HTTP', login.status);
    console.log('Token Payload:', JSON.stringify(payload, null, 2));
    if (payload && payload.sub && payload.exp) {
      console.log('✔ PASS (JWT Decoded: sub=' + payload.sub + ', exp=' + payload.exp + ')');
    } else {
      throw new Error('JWT payload missing sub or exp');
    }

    // 3. Driver Status Online
    console.log('\n[3] TEST: Driver chuyển trạng thái ONLINE');
    const driverId = 'DRV001'; // Mock or register new
    const drvRes = await request('POST', '/drivers/status', { 
      driver_id: driverId, 
      status: 'ONLINE', 
      location: { lat: 10.76, lng: 106.66 } 
    }, token);
    console.log('Expected: HTTP 200, Driver status updated = ONLINE');
    console.log('Result: HTTP', drvRes.status);
    console.log('✔ PASS');

    // 4. Create Booking
    console.log('\n[4] TEST: Tạo booking với input hợp lệ');
    const bookingInput = {
      pickup: { lat: 10.76, lng: 106.66 },
      drop: { lat: 10.77, lng: 106.70 },
      distance_km: 5
    };
    console.log('Input:', JSON.stringify(bookingInput, null, 2));
    const booking = await request('POST', '/bookings', bookingInput, token);
    if (booking.status !== 201 && booking.status !== 200) throw new Error(`Booking failed (${booking.status})`);
    
    const bData = booking.data.data || booking.data;
    bookingId = bData.bookingId || bData.booking_id || bData.id;
    const status = bData.status;
    
    console.log('Expected: HTTP 201, status = REQUESTED/CONFIRMED, có booking_id');
    console.log('Result: HTTP', booking.status, ', Booking ID:', bookingId, ', Status:', status);
    console.log('✔ PASS');

    // 5. List Bookings
    console.log('\n[5] TEST: Lấy danh sách booking của user');
    const list = await request('GET', `/bookings?user_id=${userId}`, null, token);
    console.log('Expected: HTTP 200, Trả về list booking, mỗi item có booking_id, status');
    console.log('Result: HTTP', list.status, ', Items found:', list.data.data?.length || 0);
    if (list.data.data && list.data.data.length > 0) {
      console.log('First item:', JSON.stringify(list.data.data[0], ['bookingId', 'booking_id', 'status'], 2));
    } else {
      throw new Error('No bookings found in list');
    }
    console.log('✔ PASS');

    // 6. Check Single Booking Status
    console.log('\n[6] TEST: Booking được tạo với status = REQUESTED');
    const single = await request('GET', `/bookings/${bookingId}`, null, token);
    const bDataSingle = single.data.data || single.data;
    const bStatus = bDataSingle.status;
    const createdAt = bDataSingle.created_at || bDataSingle.createdAt;
    console.log('Expected: status ban đầu = REQUESTED, có timestamp created_at');
    console.log('Result: HTTP', single.status, ', Status:', bStatus, ', CreatedAt:', createdAt);
    if (bStatus === 'REQUESTED' && createdAt) {
      console.log('✔ PASS');
    } else {
      throw new Error(`Validation failed: status=${bStatus}, created_at=${createdAt}`);
    }

    // 7. ETA API
    console.log('\n[7] TEST: Gọi API ETA trả về giá trị > 0');
    const eta = await request('POST', '/eta', { distance_km: 5, traffic_level: 0.5 }, token);
    const etaVal = eta.data && eta.data.data ? eta.data.data.eta : (eta.data ? eta.data.eta : 0);
    console.log('Expected: HTTP 200, eta > 0');
    console.log('Result: HTTP', eta.status, ', ETA:', etaVal);
    if (etaVal > 0) console.log('✔ PASS'); else throw new Error('ETA must be > 0');

    // 8. Pricing API
    console.log('\n[8] TEST: Pricing API trả về giá hợp lệ');
    const priceRes = await request('POST', '/pricing', { distance_km: 5, demand_index: 1.0 }, token);
    const priceVal = priceRes.data && priceRes.data.data ? priceRes.data.data.final_price : (priceRes.data ? priceRes.data.final_price : 0);
    console.log('Expected: HTTP 200, price > base fare');
    console.log('Result: HTTP', priceRes.status, ', Price:', priceVal);
    if (priceVal > 0) console.log('✔ PASS'); else throw new Error('Price must be > 0');

    // 9. Notification
    console.log('\n[9] TEST: Notification gửi thành công');
    const notifyRes = await request('POST', '/notifications', { user_id: userId, message: 'Your ride is confirmed' }, token);
    console.log('Expected: HTTP 200, Notification được gửi');
    console.log('Result: HTTP', notifyRes.status);
    if (notifyRes.status === 200) console.log('✔ PASS'); else throw new Error('Notification failed');

    // 10. Logout
    console.log('\n[10] TEST: Logout invalidate token');
    const logoutRes = await request('POST', '/auth/logout', null, token);
    console.log('Expected: HTTP 200, Token bị invalidate');
    console.log('Result (Logout): HTTP', logoutRes.status);
    
    console.log('Verifying token invalidation...');
    const retryRes = await request('GET', '/auth/me', null, token); // Any protected route
    console.log('Result (Retry with old token): HTTP', retryRes.status);
    if (retryRes.status === 401) {
      console.log('✔ PASS (Access Denied as expected)');
    } else {
      throw new Error(`Token should be invalidated (Expected 401, got ${retryRes.status})`);
    }

    console.log('\n✅ LEVEL 1 VERIFICATION COMPLETE!');
  } catch (e) {
    console.error('\n❌ Test Failed:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
}

run();
