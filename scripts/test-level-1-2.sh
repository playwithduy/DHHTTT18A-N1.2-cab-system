#!/bin/bash
# ============================================================
# CabGo Test Runner — Level 1 & Level 2 End-to-End Tests
# ============================================================

API_GATEWAY="http://localhost:8080"
USER_ID=""
TOKEN=""
BOOKING_ID=""

echo "🚀 Starting CabGo Level 1 & 2 Verification..."

# 1. Register User (Test 1)
echo "--- Test 1: Đăng ký user thành công ---"
REG_RES=$(curl -s -X POST $API_GATEWAY/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "123456", "name": "Test User"}')
USER_ID=$(echo $REG_RES | jq -r '.data.id // .data._id')
echo "Result: $REG_RES"

# 2. Login User (Test 2)
echo "--- Test 2: Đăng nhập trả JWT ---"
LOGIN_RES=$(curl -s -X POST $API_GATEWAY/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "123456"}')
TOKEN=$(echo $LOGIN_RES | jq -r '.data.access_token')
echo "Token: ${TOKEN:0:20}..."

# 3. Create Booking (Test 3)
echo "--- Test 3: Tạo booking hợp lệ ---"
BOOK_RES=$(curl -s -X POST $API_GATEWAY/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: first_booking_key" \
  -d '{"userId": "'$USER_ID'", "pickup": {"lat": 10.76, "lng": 106.66}, "drop": {"lat": 10.77, "lng": 106.70}, "distance_km": 5}')
BOOKING_ID=$(echo $BOOK_RES | jq -r '.data.id // .data._id')
echo "Booking ID: $BOOKING_ID"

# 11. Validation Error (Test 11)
echo "--- Test 11: Validation error 422 (Thiếu pickup) ---"
VALID_RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_GATEWAY/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"distance_km": 5}')
echo "HTTP Status: $VALID_RES (Expected: 422)"

# 13. No Driver Case (Test 13)
echo "--- Test 13: Case No drivers found ---"
# (Mocking by passing a specific lat/lng that we define as "no driver" zone if needed)
echo "(Check backend logs for 'No drivers available')"

# 19. Idempotency Check (Test 19)
echo "--- Test 19: Idempotency (Duplicate Request) ---"
DUP_RES=$(curl -s -X POST $API_GATEWAY/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: first_booking_key" \
  -d '{"userId": "'$USER_ID'", "pickup": {"lat": 10.76, "lng": 106.66}, "drop": {"lat": 10.77, "lng": 106.70}, "distance_km": 5}')
echo "Idempotency Result: $(echo $DUP_RES | jq -r '.success')"

# 20. Payload Too Large (Test 20)
echo "--- Test 20: Payload Too Large (413) ---"
LARGE_JSON=$(printf '{"data":"%1000000s"}' 'x' | tr ' ' 'x')
LARGE_RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_GATEWAY/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$LARGE_JSON")
echo "HTTP Status: $LARGE_RES (Expected: 413)"

echo "✅ All tests completed."
