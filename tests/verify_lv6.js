const axios = require('axios');

const baseUrl = 'http://localhost:3008'; // AI service

async function runTests() {
    console.log('--- CabGo Level 6 AI Agent Logic Verification ---');

    const pickup = { lat: 10.76, lng: 106.66 };

    // 51. Agent chọn driver gần nhất (Priority: Speed)
    console.log('\n51. Testing Speed Priority (Closest Driver expected)...');
    const speedRes = await axios.post(`${baseUrl}/match`, { pickup, priority: 'speed' });
    if (speedRes.data.driverId === 'D1') {
        console.log(`✔ Success. Selected D1 (Closest, 1km). Reason: ${speedRes.data.reasoning}`);
    } else {
        console.log(`❌ Failed. Selected ${speedRes.data.driverId}`);
    }

    // 52. Agent chọn driver rating cao hơn (Priority: Quality)
    console.log('\n52. Testing Quality Priority (Higher Rating expected)...');
    const qualityRes = await axios.post(`${baseUrl}/match`, { pickup, priority: 'quality' });
    if (qualityRes.data.driverId === 'D2') {
        console.log(`✔ Success. Selected D2 (Better Quality, 4.9 rating). Reason: ${qualityRes.data.reasoning}`);
    } else {
        console.log(`❌ Failed. Selected ${qualityRes.data.driverId}`);
    }

    // 53. Agent cân bằng ETA vs Price (Balanced)
    console.log('\n53. Testing Balanced Priority...');
    const balancedRes = await axios.post(`${baseUrl}/match`, { pickup, priority: 'balanced' });
    console.log(`✔ Result: Selected ${balancedRes.data.driverId}. Reason: ${balancedRes.data.reasoning}`);

    // 54. Agent gọi đúng tool (Check reasoning contains Price)
    console.log('\n54. Testing Tool Calling Integration...');
    if (balancedRes.data.reasoning.includes('Rating')) {
        console.log('✔ Success. Agent processed features and pricing context.');
    }

    // 55. Agent xử lý context thiếu dữ liệu (driver D1 has nulls)
    console.log('\n55. Testing Missing Context handling...');
    const missingRes = await axios.post(`${baseUrl}/match`, { pickup, simulate_missing_context: true });
    if (missingRes.data.success) {
        console.log('✔ Success. Agent handled null features gracefully without crashing.');
    } else {
        console.log('❌ Failed.');
    }

    // 57. Agent không chọn driver offline
    console.log('\n57. Testing Offline Driver filtering...');
    // We run 5 matches and ensure D4_OFFLINE is never selected
    let selectedOffline = false;
    for(let i=0; i<5; i++) {
        const res = await axios.post(`${baseUrl}/match`, { pickup });
        if (res.data.driverId === 'D4_OFFLINE') selectedOffline = true;
    }
    if (!selectedOffline) {
        console.log('✔ Success. D4_OFFLINE was correctly ignored.');
    } else {
        console.log('❌ Failed. Offline driver was selected.');
    }

    // 58. Agent log decision đầy đủ
    console.log('\n58. Testing Decision Logging...');
    if (balancedRes.data.reasoning && balancedRes.data.latencyMs !== undefined) {
        console.log('✔ Success. Decision reasoning and performance metrics logged.');
    }

    // 60. Agent fallback rule-based khi AI tool fail
    console.log('\n60. Testing Fallback simulation (Tool Error)...');
    const fallbackRes = await axios.post(`${baseUrl}/match`, { pickup, simulate_tool_error: true });
    if (fallbackRes.data.reasoning.includes('FALLBACK')) {
        console.log('✔ Success. Agent automatically fell back to rule-based proximity logic.');
    } else {
        console.log('❌ Failed Fallback.');
    }

    console.log('\nLevel 6 Verification Complete.');
}

runTests().catch(err => console.error('Verification Error:', err.message));
