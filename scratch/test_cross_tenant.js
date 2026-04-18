const axios = require('axios');

async function testCrossTenant() {
    const baseUrl = 'http://localhost:8080';
    try {
        console.log('--- Register User ---');
        const userReg = await axios.post(`${baseUrl}/auth/register`, {
            email: `user${Date.now()}@test.com`, password: 'password123', name: 'User'
        });
        const userToken = userReg.data.data.access_token;

        console.log('--- Register Driver ---');
        const driverReg = await axios.post(`${baseUrl}/auth/register`, {
            email: `driver${Date.now()}@test.com`, password: 'password123', name: 'Driver', role: 'DRIVER'
        });
        const driverToken = driverReg.data.data.access_token;
        const driverId = driverReg.data.data.user.id;

        console.log(`Driver ID: ${driverId}`);

        console.log('--- Create Booking as User ---');
        const book = await axios.post(`${baseUrl}/bookings`, {
            pickup: {lat: 10, lng: 106}, drop: {lat: 11, lng: 107}, distance_km: 10
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        
        const bookingId = book.data.data.id;
        console.log('Created Booking:', bookingId, 'with driverId:', book.data.data.driverId);

        console.log('--- Fetch Booking as Driver ---');
        try {
            const get = await axios.get(`${baseUrl}/bookings/${bookingId}`, {
                headers: { Authorization: `Bearer ${driverToken}` }
            });
            console.log('FAIL! Driver able to fetch successfully with status:', get.status);
        } catch (e) {
            console.log('SUCCESS! Driver got error status:', e.response?.status);
            console.log('Error message:', e.response?.data?.message);
        }

    } catch (err) {
        console.error('Test script error:', err.response?.data || err.message);
    }
}
testCrossTenant();
