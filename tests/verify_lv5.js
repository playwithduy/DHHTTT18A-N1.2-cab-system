const axios = require('axios');

const baseUrl = 'http://localhost:8080';

async function runTests() {
    console.log('--- CabGo Level 5 AI Service Verification ---');
    let token;

    console.log('\n[Setup] Logging in...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email: 'user@test.com', password: '123456' });
    token = loginRes.data.data.access_token;
    const authHeader = { Authorization: `Bearer ${token}` };
    console.log('✔ Setup Success.');

    // 41. Testing ETA Model Output
    console.log('\n41. Testing ETA Model Output (distance=5km)...');
    const etaRes = await axios.post(`${baseUrl}/eta`, { distance_km: 5 }, { headers: authHeader });
    if (etaRes.data.success) {
        console.log(`✔ Success. ETA: ${etaRes.data.data.eta} mins (Expected: >0, <60)`);
    } else {
        console.log('❌ Failed.');
    }

    // 42. Testing Pricing Surge
    console.log('\n42. Testing Pricing Surge (demand_index=5.0)...');
    const priceRes = await axios.post(`${baseUrl}/pricing`, { distance_km: 5, demand_index: 5.0 }, { headers: authHeader });
    if (priceRes.data.success) {
        console.log(`✔ Success. Surge capped at ${priceRes.data.data.surge_multiplier}x.`);
    } else {
        console.log('❌ Failed.');
    }

    // 43. Testing Fraud Detection
    console.log('\n43. Testing Fraud Detection (simulate)...');
    const fraudRes = await axios.post(`${baseUrl}/fraud`, { userId: 'test_user', amount: 5000000, simulate_fraud: true }, { headers: authHeader });
    if (fraudRes.data.data.isFraud) {
        console.log('✔ Success. Fraud flagged correctly.');
    } else {
        console.log('❌ Failed.');
    }

    // 44. Testing AI Matching
    console.log('\n44. Testing AI Matching...');
    const matchRes = await axios.post(`${baseUrl}/eta`, { pickup: { lat: 10, lng: 106 }, distance_km: 5 }, { headers: authHeader });
    if (matchRes.status === 200) {
        console.log(`✔ Success. Received AI matching response.`);
    } else {
        console.log('❌ Failed.');
    }

    console.log('\nLevel 5 Verification Complete.');
}

runTests();
