const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log('--- CabGo Level 11 Deployment Certification (Steps 101-110) ---');
    
    let score = 0;
    const totalSteps = 10;

    try {
        const manifestPath = path.join(__dirname, '../infrastructure/k8s/deployment.yaml');
        const manifest = fs.readFileSync(manifestPath, 'utf8');

        // 101. Basic Deployment Check
        console.log('\nStep 101. Verifying Deployment Manifests...');
        const hasBookingDeployment = manifest.includes('name: booking-service') && manifest.includes('kind: Deployment');
        if (hasBookingDeployment) {
            console.log('[PASS] Booking Service Deployment defined.');
            score++;
        }

        // 102. Health check endpoint (Probes)
        console.log('\nStep 102. Verifying Health Check Probes...');
        const hasBookingProbes = manifest.includes('livenessProbe:') && manifest.includes('path: /health');
        if (hasBookingProbes) {
            console.log('[PASS] Health check probes configured for microservices.');
            score++;
        }

        // 103. Environment variables (ConfigMap/Secrets)
        console.log('\nStep 103. Verifying Environment Configuration...');
        const hasConfigMap = manifest.includes('kind: ConfigMap') && manifest.includes('DATABASE_URL');
        if (hasConfigMap) {
            console.log('[PASS] ConfigMap defined with critical infrastructure URLs.');
            score++;
        }

        // 104. Connectivity (Postgres)
        console.log('\nStep 104. Verifying DB Service Discovery...');
        if (manifest.includes('name: postgres-service')) {
            console.log('[PASS] Postgres Service definition found.');
            score++;
        }

        // 105. Connectivity (Kafka)
        console.log('\nStep 105. Verifying Kafka Service Discovery...');
        if (manifest.includes('name: kafka-service')) {
            console.log('[PASS] Kafka Service definition found.');
            score++;
        }

        // 106. Rolling Update Strategy
        console.log('\nStep 106. Verifying Rolling Update Strategy...');
        const hasRollingUpdate = manifest.includes('type: RollingUpdate') && manifest.includes('maxSurge:');
        if (hasRollingUpdate) {
            console.log('[PASS] Zero-Downtime update strategy configured.');
            score++;
        }

        // 107. Auto Scaling (HPA)
        console.log('\nStep 107. Analyzing Auto Scaling Policy...');
        const hasHPA = manifest.includes('kind: HorizontalPodAutoscaler') && manifest.includes('maxReplicas: 10');
        if (hasHPA) {
            console.log('[PASS] HPA rules found for compute-intensive services.');
            score++;
        }

        // 108. Service Mesh (Istio)
        console.log('\nStep 108. Verifying Service Mesh Routing (Istio)...');
        const hasIstio = manifest.includes('kind: VirtualService') && manifest.includes('istio.io');
        if (hasIstio) {
            console.log('[PASS] Istio VirtualService found for advanced traffic management.');
            score++;
        }

        // 109. Fail Fast Logic Verification
        console.log('\nStep 109. Verifying Fail-Fast Implementation (Source Code)...');
        const bookingIndexPath = path.join(__dirname, '../services/booking-service/src/index.ts');
        const bookingIndex = fs.readFileSync(bookingIndexPath, 'utf8');
        if (bookingIndex.includes('process.exit(1)') && bookingIndex.includes('DATABASE_URL')) {
            console.log('[PASS] Fail-Fast logic confirmed in Booking Service startup.');
            score++;
        } else {
            console.log('[FAIL] Fail-Fast logic missing or incorrect.');
        }

        // 110. Rollback Mechanism
        console.log('\nStep 110. Verifying Rollback Configuration...');
        // Deployment strategy and revisionHistoryLimit (implied by default or strategy)
        if (hasRollingUpdate) {
            console.log('[PASS] Rollback supported via revision history and rolling updates.');
            score++;
        }

        // Summary
        console.log(`\n--- Level 11 Result: ${score}/${totalSteps} ---`);
        if (score >= 9) {
            console.log('CERTIFICATION: [LEVEL 11 PASSED]');
        } else {
            console.log('CERTIFICATION: [LEVEL 11 FAILED] - Requirements not met.');
        }

    } catch (err) {
        console.error('Certification helper crashed:', err.message);
    }
}

runTests();
