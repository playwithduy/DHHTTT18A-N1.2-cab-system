const axios = require('axios');
const baseUrl = 'http://localhost:8080';

async function seed() {
    try {
        // 1. Register USER (ignore duplicate error)
        await axios.post(`${baseUrl}/auth/register`, {
            email: 'user_cicd@test.com',
            password: 'password123',
            name: 'CICD User',
            phone: '0900000001'
        }).catch(() => {});

        // 2. Register DRIVER using correct role enum (ignore duplicate error)
        await axios.post(`${baseUrl}/auth/register`, {
            email: 'driver_cicd@test.com',
            password: 'password123',
            name: 'CICD Driver',
            phone: '0900000002',
            role: 'DRIVER'
        }).catch(() => {});

        // 3. Login User - check both token field names
        const userLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'user_cicd@test.com',
            password: 'password123'
        });
        const USER_TOKEN = userLogin.data.data.access_token
            || userLogin.data.data.token
            || userLogin.data.token
            || userLogin.data.access_token;

        // 4. Login Driver
        const driverLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'driver_cicd@test.com',
            password: 'password123'
        });
        const DRIVER_TOKEN = driverLogin.data.data.access_token
            || driverLogin.data.data.token
            || driverLogin.data.token
            || driverLogin.data.access_token;
        const DRIVER_ID = driverLogin.data.data.user?.id
            || driverLogin.data.data.user?._id
            || driverLogin.data.user_id
            || 'driver-cicd-id';

        if (!USER_TOKEN) {
            console.error('Seed Error: Could not extract USER_TOKEN from response:', JSON.stringify(userLogin.data));
            process.exit(1);
        }

        // 5. Set Driver Online (Critical for Level 1 Tests)
        await axios.post(`${baseUrl}/drivers/status`, {
            driver_id: DRIVER_ID,
            status: 'ONLINE'
        }, {
            headers: { Authorization: `Bearer ${DRIVER_TOKEN}` }
        }).catch((err) => {
            console.warn('Seed Warning: Could not set driver online:', err.message);
        });

        // Output ALL possible variable name aliases used across collections
        const USER_ID = userLogin.data.data?.user?.id || userLogin.data?.data?.user?._id || userLogin.data?.user_id || 'test-user-id';
        console.log([
            `--env-var "accessToken=${USER_TOKEN}"`,
            `--env-var "access_token=${USER_TOKEN}"`,
            `--env-var "token=${USER_TOKEN}"`,
            `--env-var "USER_TOKEN=${USER_TOKEN}"`,
            `--env-var "userId=${USER_ID}"`,
            `--env-var "USER_ID=${USER_ID}"`,
            `--env-var "DRIVER_TOKEN=${DRIVER_TOKEN || USER_TOKEN}"`,
            `--env-var "driverId=${DRIVER_ID}"`,
            `--env-var "DRIVER_ID=${DRIVER_ID}"`
        ].join(' '));
    } catch (err) {
        console.error('Seed Error:', err.message, err.response?.data || '');
        process.exit(1);
    }
}

seed();
