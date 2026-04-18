const axios = require('axios');

const baseUrl = 'http://localhost:8080';
let token = '';

async function request(method, path, data = {}, token = null, headers = {}) {
    try {
        const res = await axios({
            method,
            url: `${baseUrl}${path}`,
            data,
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
                ...headers
            },
            validateStatus: () => true
        });
        return res;
    } catch (err) {
        return { status: 500, data: { message: err.message } };
    }
}

async function runTests() {
    console.log('--- CabGo Level 2 Verification ---');

    // Setup: Login to get token
    console.log('\n[Setup] Logging in...');
    const loginRes = await request('POST', '/auth/login', { email: 'user@test.com', password: '123456' });
    if (loginRes.status !== 200) {
        console.log('❌ Setup failed.');
        return;
    }
    token = loginRes.data.data.access_token;
    console.log('✔ Setup Success.');

    // 11. Missing Pickup
    console.log('\n11. Testing Missing Fields (Expect 4xx)...');
    const res11 = await request('POST', '/bookings', { drop: { lat: 10, lng: 106 }, distance_km: 5 }, token);
    if (res11.status >= 400 && res11.status < 500) {
        console.log('✔ Success:', res11.status);
    } else {
        console.log('❌ Failed:', res11.status, res11.data);
    }

    // 12. Invalid Lat/Lng
    console.log('\n12. Testing Invalid Coordinates (Expect 422)...');
    const res12 = await request('POST', '/bookings', { pickup: { lat: 'abc', lng: 106 }, drop: { lat: 10, lng: 106 }, distance_km: 5 }, token);
    if (res12.status === 422 || res12.status === 400) {
        console.log('✔ Success');
    } else {
        console.log('❌ Failed:', res12.status, res12.data);
    }

    // 13. No Drivers (Simulated)
    console.log('\n13. Testing No Drivers (Status check)...');
    const res13 = await request('POST', '/bookings', { 
        pickup: { lat: 0, lng: 0 }, 
        drop: { lat: 1, lng: 1 },
        distance_km: 100
    }, token);
    console.log('✔ Result Status:', res13.data.data?.status || 'N/A');

    // 14. Invalid Payment Method
    console.log('\n14. Testing Invalid Payment Method (Expect 4xx)...');
    const res14 = await request('POST', '/bookings', { 
        pickup: { lat: 10.7, lng: 106.6 }, 
        drop: { lat: 10.8, lng: 106.7 },
        distance_km: 10,
        payment_method: 'invalid_card'
    }, token);
    if (res14.status >= 400 && res14.status < 500) {
        console.log('✔ Success');
    } else {
        console.log('❌ Failed:', res14.status, res14.data);
    }

    // 15. ETA with Distance 0
    console.log('\n15. Testing ETA with Distance 0...');
    const res15 = await request('POST', '/eta', { distance_km: 0 }, token);
    if (res15.status === 200) {
        console.log('✔ Success. ETA:', res15.data.data?.eta);
    } else {
        console.log('❌ Failed.');
    }

    // 19. Idempotency
    console.log('\n19. Testing Idempotency (Duplicate Request)...');
    const ikey = 'test-ikey-' + Math.random();
    const payload = { pickup: { lat: 10.1, lng: 106.1 }, drop: { lat: 10.2, lng: 106.2 }, distance_km: 5 };
    
    console.log('Request 1...');
    const res19a = await request('POST', '/bookings', payload, token, { 'x-idempotency-key': ikey });
    const id1 = res19a.data.data?.bookingId || res19a.data.data?.id || res19a.data.data?.booking_id;
    
    console.log('Request 2 (same key)...');
    const res19b = await request('POST', '/bookings', payload, token, { 'x-idempotency-key': ikey });
    const id2 = res19b.data.data?.bookingId || res19b.data.data?.id || res19b.data.data?.booking_id;
    
    if (id1 === id2 && id1 !== undefined) {
        console.log('✔ Success. Same booking ID returned.');
    } else {
        console.log('❌ Failed. IDs:', id1, id2);
    }

    // 20. Payload Too Large
    console.log('\n20. Testing Payload Too Large (Expect 413)...');
    const largeData = 'a'.repeat(1.5 * 1024 * 1024); // 1.5 MB
    const res20 = await request('POST', '/bookings', { data: largeData }, token);
    if (res20.status === 413) {
        console.log('✔ Success (413 Payload Too Large)');
    } else {
        console.log('❌ Failed:', res20.status);
    }

    console.log('\nLevel 2 Verification Complete.');
}

runTests();
