const fs = require('fs');
const file = 'E:/Cab-booking/tests/Level6_Tests.postman_collection.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const t55 = {
  name: '55. Agent xử lý context thiếu dữ liệu',
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('Not crash on missing data', () => { pm.response.to.have.status(200); });"] } }],
  request: { method: 'POST', header: [], body: { mode: 'raw', raw: '{"pickup": {"lat": 10.76, "lng": 106.66}, "simulate_missing_context": true}', options: { raw: { language: 'json' } } }, url: { raw: '{{baseUrl}}/match', host: ['{{baseUrl}}'], path: ['match'] } }
};

const t56 = {
  name: '56. Agent retry khi service lỗi',
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('Handled without system crash', () => { pm.response.to.have.status(200); });"] } }],
  request: { method: 'POST', header: [], body: { mode: 'raw', raw: '{"pickup": {"lat": 10.76, "lng": 106.66}, "simulate_tool_error": true}', options: { raw: { language: 'json' } } }, url: { raw: '{{baseUrl}}/match', host: ['{{baseUrl}}'], path: ['match'] } }
};

const t57 = {
  name: '57. Agent không chọn driver offline',
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('Driver marked OFFLINE', () => { pm.response.to.have.status(200); });"] } }],
  request: { auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }] }, method: 'POST', body: { mode: 'raw', raw: '{"driver_id": "D_QUALITY", "status": "OFFLINE"}', options: { raw: { language: 'json' } } }, url: { raw: '{{baseUrl}}/drivers/status', host: ['{{baseUrl}}'], path: ['drivers', 'status'] } }
};

const t58 = {
  name: '58. Agent log decision đầy đủ',
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('Check backend logs for reasoning trace', () => { pm.response.to.have.status(200); });"] } }],
  request: { method: 'POST', header: [], body: { mode: 'raw', raw: '{"pickup": {"lat": 10.76, "lng": 106.66}}', options: { raw: { language: 'json' } } }, url: { raw: '{{baseUrl}}/match', host: ['{{baseUrl}}'], path: ['match'] } }
};

const t59 = {
  name: '59. Agent xử lý nhiều request song song (No Race Condition)',
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: ["pm.test('Concurrency safe', () => { pm.response.to.have.status(200); });"] } }],
  request: { method: 'POST', header: [], body: { mode: 'raw', raw: '{"pickup": {"lat": 10.76, "lng": 106.66}, "priority": "speed"}', options: { raw: { language: 'json' } } }, url: { raw: '{{baseUrl}}/match', host: ['{{baseUrl}}'], path: ['match'] } }
};

// Remove any existing 55-59 if present to avoid duplication
data.item = data.item.filter(i => !i.name.startsWith('55.') && !i.name.startsWith('56.') && !i.name.startsWith('57.') && !i.name.startsWith('58.') && !i.name.startsWith('59.'));

// Insert before the last test (Test 60)
let idx = data.item.findIndex(i => i.name.startsWith('60.'));
if (idx === -1) idx = data.item.length;
data.item.splice(idx, 0, t55, t56, t57, t58, t59);

fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('Added tests 55-59 successfully');
