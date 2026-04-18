const cp = require('child_process'); 
const seed = cp.execSync('node tests/seed.js').toString(); 
const tokenMatch = seed.match(/accessToken=([^\"]+)/); 
const token = tokenMatch ? tokenMatch[1] : ''; 
const axios = require('axios'); 

axios.post('http://localhost:8080/eta', { distance_km: 5 }, { headers: { Authorization: 'Bearer ' + token } })
.then(res => console.log('SUCCESS:', res.data))
.catch(e => console.error('ERROR:', e.response ? e.response.data : e.message));
