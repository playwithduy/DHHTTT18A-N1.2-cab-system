import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        constant_request_rate: {
            executor: 'constant-arrival-rate',
            rate: 1000,
            timeUnit: '1s',
            duration: '30s',
            preAllocatedVUs: 100,
            maxVUs: 500,
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'], 
        http_req_duration: ['p(95)<200', 'p(99)<500'], 
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || 'test_token';

export default function () {
    const payload = JSON.stringify({
        pickup: { lat: 10.76, lng: 106.66 },
        drop: { lat: 10.77, lng: 106.70 },
        distance_km: 5
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'x-idempotency-key': `k6-perf-${__VU}-${__ITER}`,
        },
    };

    const res = http.post(`${BASE_URL}/bookings`, payload, params);

    // Assert that we don't hit DB Connection pool exhaustion errors (500s)
    check(res, {
        'status is 201 or 409 (conflict)': (r) => r.status === 201 || r.status === 409,
        'no db pool exhaustion': (r) => r.status !== 500,
    });
}
