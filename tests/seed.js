const axios = require('axios');
const baseUrl = 'http://localhost:8080';

async function seed() {
    try {
        // 1. Register User
        await axios.post(`${baseUrl}/auth/register`, {
            email: 'user_cicd@test.com',
            password: 'password123',
            name: 'CICD User',
            phone: '0900000001'
        }).catch(() => {}); // Ignore duplicate error
        
        const userLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'user_cicd@test.com',
            password: 'password123'
        });
        const USER_TOKEN = userLogin.data.data.token;

        // 2. Register Driver
        await axios.post(`${baseUrl}/auth/register_driver`, {
            email: 'driver_cicd@test.com',
            password: 'password123',
            name: 'CICD Driver',
            phone: '0900000002',
            license_plate: '59A-12345',
            vehicle_type: 'CAR'
        }).catch(() => {});
        
        const driverLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'driver_cicd@test.com',
            password: 'password123'
        });
        const DRIVER_TOKEN = driverLogin.data.data.token;
        const DRIVER_ID = driverLogin.data.data.user.id || driverLogin.data.data.user._id;

        // Return outputs so bash can use them
        // Output all possible aliases used in the collections: accessToken, access_token, USER_TOKEN, token
        console.log(`--env-var "accessToken=${USER_TOKEN}" --env-var "access_token=${USER_TOKEN}" --env-var "token=${USER_TOKEN}" --env-var "USER_TOKEN=${USER_TOKEN}" --env-var "DRIVER_TOKEN=${DRIVER_TOKEN}" --env-var "driverId=${DRIVER_ID}" --env-var "DRIVER_ID=${DRIVER_ID}"`);
    } catch (err) {
        console.error('Seed Error:', err.message);
        process.exit(1);
    }
}

seed();
