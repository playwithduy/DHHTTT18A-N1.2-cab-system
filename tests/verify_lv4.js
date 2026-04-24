const axios = require('axios');

const baseUrl = 'http://localhost:8080';
let token = '';
const ts = Date.now();

async function request(method, path, data = {}, extraHeaders = {}) {
    try {
        const res = await axios({
            method,
            url: `${baseUrl}${path}`,
            data,
            headers: {
                Authorization: `Bearer ${token}`,
                ...extraHeaders
            },
            validateStatus: () => true
        });
        return res;
    } catch (err) {
        return { status: 500, data: { message: err.message } };
    }
}

async function runTests() {
    console.log('--- CabGo Level 4 Verification (Dynamic) ---');

    // Setup: Register & Login
    console.log('\n[0] Setup: Registering User...');
    const userEmail = `user_lv4_${ts}@test.com`;
    await axios.post(`${baseUrl}/auth/register`, { email: userEmail, password: 'password', name: 'User LV4' });
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email: userEmail, password: 'password' });
    token = loginRes.data.data.access_token;
    console.log('✔ Logged in.');

    const randString = () => Math.random().toString(36).substring(7);

    // 31. Success Transaction
    console.log('\n31. Testing Success Transaction...');
    const sRes = await request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5
    }, { 'x-idempotency-key': `success-${randString()}` });
    if (sRes.status === 201 || sRes.status === 200) {
        console.log('✔ Success. Status:', sRes.data.data.status);
    } else {
        console.log('❌ Failed:', sRes.status, sRes.data);
    }

    // 32. Rollback when Error
    console.log('\n32. Testing DB Rollback (Simulation)...');
    const rRes = await request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5,
        simulate_db_error: true
    }, { 'x-idempotency-key': `rollback-${randString()}` });
    
    if (rRes.status === 500 && JSON.stringify(rRes.data).includes('DB_ERROR')) {
        console.log('✔ Success. API returned 500 error as expected.');
    } else {
        console.log('❌ Failed: Expected 500, got', rRes.status, rRes.data);
    }

    // 33. Payment Fail -> Rollback (Compensation)
    console.log('\n33. Testing Payment Failure (Compensation)...');
    const fRes = await request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5,
        simulate_payment_failure: true
    }, { 'x-idempotency-key': `payfail-${randString()}` });
    if (fRes.status === 400 && fRes.data.data && fRes.data.data.status === 'FAILED') {
        console.log('✔ Success. Booking correctly rolled back to FAILED status.');
    } else {
        console.log('❌ Failed Compensation:', fRes.status, fRes.data);
    }

    // 34. Idempotency Check
    console.log('\n34. Testing Idempotency (Serial)...');
    const key = `idemp-${randString()}`;
    const idRes1 = await request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5
    }, { 'x-idempotency-key': key });
    
    const idRes2 = await request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5
    }, { 'x-idempotency-key': key });

    const b1Id = idRes1.data.data?.id;
    const b2Id = idRes2.data.data?.id;

    if (b1Id === b2Id && idRes2.status === 200) {
        console.log('✔ Idempotency confirmed. Second request returned 200 and same ID.');
    } else {
        console.log('❌ Idempotency failed. Status2:', idRes2.status, 'SameID:', b1Id === b2Id);
    }

    // 35. Race Condition (Parallel)
    console.log('\n35. Testing Race Condition (Parallel 2 requests)...');
    const raceKey1 = `race1-${randString()}`;
    const raceKey2 = `race2-${randString()}`;
    const p1 = request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5
    }, { 'x-idempotency-key': raceKey1 });
    const p2 = request('POST', '/bookings', {
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5
    }, { 'x-idempotency-key': raceKey2 });

    const [res1, res2] = await Promise.all([p1, p2]);
    console.log('Request 1 Status:', res1.status);
    console.log('Request 2 Status:', res2.status);
    
    if ((res1.status === 201 && res2.status === 409) || (res2.status === 201 && res1.status === 409)) {
        console.log('✔ Race condition handled via Redis Lock (One 201, One 409 Concurrent).');
    } else {
        console.log('❌ Race condition check failed.');
    }

    console.log('\nLevel 4 Verification Complete.');
}

runTests().catch(err => console.error('Verification Error:', err.message));
