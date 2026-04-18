const axios = require('axios');

const baseUrl = 'http://localhost:8080';
const DURATION_SEC = 20; 
const TARGET_RPS = 50; // Stable target for single machine
const BATCH_SIZE = 5;

async function runLoadTest() {
    console.log('--- CabGo Level 7 Performance & Load Test ---');
    
    // 1. Setup: Register a NEW clean user for the test
    const testId = Date.now();
    const email = `loadtest_${testId}@test.com`;
    console.log(`Registering user ${email}...`);
    
    try {
        await axios.post(`${baseUrl}/auth/register`, {
            email,
            password: 'password123',
            name: 'Load Test User',
            phone: `099${testId}`.slice(0, 10)
        });
        
        const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password: 'password123' });
        const token = loginRes.data.data.access_token;
        console.log('✔ Authenticated.');

        const headers = { Authorization: `Bearer ${token}` };
        const latencies = [];
        let successCount = 0;
        let errorCount = 0;

        console.log(`Starting Load Test: ${TARGET_RPS} RPS for ${DURATION_SEC}s...`);
        const startTime = Date.now();
        const endTime = startTime + (DURATION_SEC * 1000);

        while (Date.now() < endTime) {
            const batchStart = Date.now();
            const promises = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const reqStart = Date.now();
                promises.push(
                    axios.post(`${baseUrl}/bookings`, {
                        pickup: { lat: 10.76, lng: 106.66 },
                        drop: { lat: 10.77, lng: 106.70 },
                        distance_km: 5
                    }, { headers, validateStatus: () => true, timeout: 5000 })
                    .then(res => {
                        const duration = Date.now() - reqStart;
                        latencies.push(duration);
                        if (res.status === 201 || res.status === 200) successCount++;
                        else errorCount++;
                    })
                    .catch(() => errorCount++)
                );
            }

            await Promise.all(promises);

            const elapsed = Date.now() - batchStart;
            const sleepTime = (BATCH_SIZE / TARGET_RPS * 1000) - elapsed;
            if (sleepTime > 0) await new Promise(r => setTimeout(r, sleepTime));
        }

        const totalTime = (Date.now() - startTime) / 1000;
        latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const successRate = (successCount / (successCount + errorCount)) * 100;

        console.log('\n--- Load Test Results ---');
        console.log(`Total Requests: ${successCount + errorCount}`);
        console.log(`Success Rate: ${successRate.toFixed(2)}%`);
        console.log(`P95 Latency: ${p95}ms`);

        if (successRate > 90 && p95 < 1000) {
            console.log('\n✔ Level 7 Passed: High load handled.');
        } else {
            console.log('\n❌ Level 7 Performance Alert.');
        }

    } catch (err) {
        console.error('Setup Error:', err.response?.data || err.message);
    }
}

runLoadTest();
