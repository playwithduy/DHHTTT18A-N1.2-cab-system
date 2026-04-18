const { execSync } = require('child_process');
const path = require('path');

const levels = [
    { name: 'Level 1: Basic Flow (Auth/Booking/Driver)', script: 'verify_lv1.js' },
    { name: 'Level 2: Distributed Locking & Concurrency', script: 'verify_lv2.js' },
    { name: 'Level 3: Observability (Logs/Traces/Metrics)', script: 'verify_lv3.js' },
    { name: 'Level 4: Distributed Transactions (Saga)', script: 'verify_lv4.js' },
    { name: 'Level 5: Database Mastery (CQRS/Indexing)', script: 'verify_lv5.js' },
    { name: 'Level 6: Communication (Kafka/gRPC/WebSocket)', script: 'verify_lv6.js' },
    { name: 'Level 8: Resilience (Circuit Breaker/Graceful)', script: 'verify_lv8.js' },
    { name: 'Level 9: Security (SQLi/XSS/RBAC/Masking)', script: 'verify_lv9.js' }
];

console.log('================================================================');
console.log('   CABGO MASTER SYSTEM CERTIFICATION - FINAL VERIFICATION');
console.log('================================================================');
console.log('Timestamp:', new Date().toLocaleString());
console.log('');

let passed = 0;
let failed = 0;

levels.forEach((lv, index) => {
    console.log(`[${index + 1}/${levels.length}] Running ${lv.name}...`);
    try {
        const scriptPath = path.join(__dirname, lv.script);
        // Using inherit for real-time feedback or pipe to capture?
        // Let's use inherit for cleaner look in large consoles
        execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
        console.log(`✔ ${lv.name} PASSED\n`);
        passed++;
    } catch (err) {
        console.log(`❌ ${lv.name} FAILED\n`);
        failed++;
    }
});

console.log('================================================================');
console.log('CERTIFICATION SUMMARY');
console.log('================================================================');
console.log(`TOTAL LEVELS TESTED: ${levels.length}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);

if (failed === 0) {
    console.log('\n🏆 STATUS: SYSTEM CERTIFIED (100% SUCCESS RATE)');
    console.log('All ACID, Resilience, Security, and Transactional goals met.');
} else {
    console.warn('\n⚠️ STATUS: CERTIFICATION INCOMPLETE');
    console.warn('Some regression issues found. Check logs above.');
}
console.log('================================================================');
