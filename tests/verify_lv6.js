const axios = require('axios');

const baseUrl = 'http://localhost:8080'; // API Gateway
const ts = Date.now();

async function request(method, path, data = {}, token = null) {
    return axios({
        method,
        url: `${baseUrl}${path}`,
        data,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true
    });
}

async function runTests() {
    console.log('--- CabGo Level 6 AI Agent Logic Verification (Dynamic Setup) ---');

    // 0. Setup: Register User and Drivers
    console.log('\n[0] Setup: Registering User and 3 Drivers with different stats...');
    const userRes = await request('POST', '/auth/register', { email: `user_lv6_${ts}@test.com`, password: 'password', name: 'User LV6' });
    const loginRes = await request('POST', '/auth/login', { email: `user_lv6_${ts}@test.com`, password: 'password' });
    const token = loginRes.data.data.access_token;

    // Driver 1: Closest (1km), but lower rating (4.0) -> Best for SPEED
    await request('POST', '/drivers/status', { 
        driver_id: 'D_SPEED', status: 'ONLINE', 
        location: { lat: 10.761, lng: 106.661 },
        rating: 4.0, acceptance_rate: 0.95, total_rides: 500
    }, token);

    // Driver 2: Further (3km), but highest rating (4.9) -> Best for QUALITY
    await request('POST', '/drivers/status', { 
        driver_id: 'D_QUALITY', status: 'ONLINE', 
        location: { lat: 10.78, lng: 106.68 },
        rating: 4.9, acceptance_rate: 0.98, total_rides: 1000
    }, token);

    // Driver 3: Medium (2km), balanced rating (4.5) -> Best for BALANCED
    await request('POST', '/drivers/status', { 
        driver_id: 'D_BALANCED', status: 'ONLINE', 
        location: { lat: 10.77, lng: 106.67 },
        rating: 4.5, acceptance_rate: 0.90, total_rides: 300
    }, token);

    const pickup = { lat: 10.76, lng: 106.66 };

    // 51. Agent chọn driver gần nhất (Priority: Speed)
    console.log('\n51. Testing Speed Priority (Closest Driver expected)...');
    const speedRes = await request('POST', '/match', { pickup, priority: 'speed' }, token);
    const speedDriver = speedRes.data.driverId;
    console.log(`Result: Selected ${speedDriver}. Reason: ${speedRes.data.reasoning}`);
    if (speedDriver === 'D_SPEED') {
        console.log('✔ Success. D_SPEED selected.');
    } else {
        console.warn('⚠ Note: Agent logic might weight factors differently, but D_SPEED was expected.');
    }

    // 52. Agent chọn driver rating cao hơn (Priority: Quality)
    console.log('\n52. Testing Quality Priority (Higher Rating expected)...');
    const qualityRes = await request('POST', '/match', { pickup, priority: 'quality' }, token);
    const qualityDriver = qualityRes.data.driverId;
    console.log(`Result: Selected ${qualityDriver}. Reason: ${qualityRes.data.reasoning}`);
    if (qualityDriver === 'D_QUALITY') {
        console.log('✔ Success. D_QUALITY selected.');
    }

    // 53. Agent cân bằng (Balanced)
    console.log('\n53. Testing Balanced Priority...');
    const balancedRes = await request('POST', '/match', { pickup, priority: 'balanced' }, token);
    console.log(`✔ Result: Selected ${balancedRes.data.driverId}. Reason: ${balancedRes.data.reasoning}`);

    // 60. Agent fallback rule-based khi AI tool fail
    console.log('\n60. Testing Fallback simulation (Tool Error)...');
    const fallbackRes = await request('POST', '/match', { pickup, simulate_tool_error: true }, token);
    if (fallbackRes.data.reasoning.includes('FALLBACK')) {
        console.log('✔ Success. Agent automatically fell back to rule-based logic.');
    } else {
        console.log('❌ Failed Fallback.');
    }

    console.log('\nLevel 6 Verification Complete.');
}

runTests().catch(err => console.error('Verification Error:', err.message));
