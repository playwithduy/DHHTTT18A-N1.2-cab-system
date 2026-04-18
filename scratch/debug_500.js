const axios = require('axios');

async function debug() {
    const baseUrl = 'http://localhost:8080';
    try {
        console.log('--- Step 1: Register ---');
        const reg = await axios.post(`${baseUrl}/auth/register`, {
            email: `debug${Date.now()}@test.com`,
            password: 'password123',
            name: 'Debug User'
        });
        const token = reg.data.data.access_token;
        const userId = reg.data.user_id;

        console.log('--- Step 2: Create Booking ---');
        const book = await axios.post(`${baseUrl}/bookings`, {
            pickup: {lat: 10, lng: 106},
            drop: {lat: 11, lng: 107},
            distance_km: 10
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const bookingId = book.data.data.id;
        console.log('Created Booking ID:', bookingId);

        console.log('--- Step 3: Get Booking (The failing step) ---');
        const get = await axios.get(`${baseUrl}/bookings/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success!', get.status, get.data);

    } catch (err) {
        console.error('FAILED with status:', err.response?.status);
        console.error('Error Body:', JSON.stringify(err.response?.data, null, 2));
        if (err.response?.data?.stack) {
            console.error('Stack Trace:', err.response.data.stack);
        }
    }
}

debug();
