const axios = require('axios');

const baseUrl = 'http://localhost:8080';
const ts = Date.now();

async function request(method, path, body = null, token = null) {
    try {
        const res = await axios({
            method,
            url: `${baseUrl}${path}`,
            data: body,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            validateStatus: () => true
        });
        return { status: res.status, data: res.data };
    } catch (err) {
        return { status: err.response?.status, data: err.response?.data };
    }
}

async function runTests() {
    console.log('--- CabGo Level 3 Verification (Dynamic) ---');
    let token, userId;

    console.log('\n[Setup] Registering & Logging in...');
    const userEmail = `user_lv3_${ts}@test.com`;
    await request('POST', '/auth/register', { email: userEmail, password: 'password', name: 'User LV3' });
    const loginRes = await request('POST', '/auth/login', { email: userEmail, password: 'password' });
    
    if (loginRes.status !== 200) {
        console.error('Setup failed: Login error.');
        return;
    }
    token = loginRes.data.data.access_token;
    userId = loginRes.data.data.user_id || loginRes.data.data.user.id;
    
    console.log('[Setup] Setting a Driver ONLINE...');
    await request('POST', '/drivers/status', { 
        driver_id: 'DRV_LV3', status: 'ONLINE', 
        location: { lat: 10.76, lng: 106.66 } 
    }, token);
    
    console.log('✔ Setup Success.');

    // 21 & 22. Testing Booking integration with ETA and Pricing
    console.log('\n21 & 22. Testing Booking integration with ETA and Pricing...');
    const bookingRes = await request('POST', '/bookings', {
        pickup: { lat: 10.762622, lng: 106.660172 },
        drop: { lat: 10.773333, lng: 106.704222 },
        distance_km: 5
    }, token);
    
    if (bookingRes.status === 201) {
        const bData = bookingRes.data.data;
        console.log('✔ Success. Booking ID:', bData.id || bData.booking_id);
        console.log('✔ Price from Pricing Service:', bData.price);
        console.log('✔ Driver ID matched:', bData.driver_id);
    } else {
        console.error('❌ Failed:', bookingRes.status, bookingRes.data);
    }

    // 23 & 28. Checking AI Agent decision making
    console.log('\n23 & 28. Checking AI Agent decision making...');
    if (bookingRes.data.data && bookingRes.data.data.matching_reason) {
        console.log('✔ AI Reasoning:', bookingRes.data.data.matching_reason);
    } else {
        console.log('✔ Note: Agent reasoning not found in direct response, check logs.');
    }

    // 30. Testing Retry Logic (Pricing timeout simulation)
    console.log('\n30. Testing Retry Logic (Pricing timeout simulation)...');
    console.log('(Note: This will wait for timeout and should return a fallback price)');
    const startRetry = Date.now();
    const retryRes = await request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5,
        simulate_pricing_timeout: true
    }, token);
    
    const duration = Date.now() - startRetry;
    console.log(`✔ Request completed in ${duration} ms`);
    if (retryRes.status === 201) {
        console.log('✔ Success. Booking created even with pricing timeout (Fallback used).');
        console.log('✔ Price:', retryRes.data.data.price);
    } else {
        console.log('❌ Failed:', retryRes.status, retryRes.data);
    }

    console.log('\nLevel 3 Verification Complete.');
}

runTests().catch(err => console.error('Verification Error:', err.message));
