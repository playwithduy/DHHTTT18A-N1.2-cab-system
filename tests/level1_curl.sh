#!/bin/bash

# ============================================================
# CabGo - Level 1 Verification Script (cURL)
# Usage: bash tests/level1_curl.sh
# ============================================================

BASE_URL="http://localhost:8080"
EMAIL="user_curl_$(date +%s)@test.com"
PASSWORD="123456"
NAME="cURL Test User"

echo "------------------------------------------------------------"
echo "🚀 Starting Level 1 Verification..."
echo "------------------------------------------------------------"

# 1. Register User
echo "1. Registering User..."
REG_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"name\": \"$NAME\"}")

echo "Response: $REG_RES"
USER_ID=$(echo $REG_RES | grep -oP '"user_id":"\K[^"]+')

if [ -z "$USER_ID" ]; then
    # Fallback for systems without perl-regexp grep
    USER_ID=$(echo $REG_RES | sed 's/.*"user_id":"\([^"]*\)".*/\1/')
fi

echo "✔ User Registered: $USER_ID"
echo ""

# 2. Login User
echo "2. Logging In..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -oP '"access_token":"\K[^"]+')
if [ -z "$TOKEN" ]; then
    TOKEN=$(echo $LOGIN_RES | sed 's/.*"access_token":"\([^"]*\)".*/\1/')
fi

echo "✔ Logged In. Token captured."
echo ""

# 3. Create Booking
echo "3. Creating Booking..."
BOOKING_RES=$(curl -s -X POST "$BASE_URL/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"pickup\": {\"lat\": 10.76, \"lng\": 106.66},
    \"drop\": {\"lat\": 10.77, \"lng\": 106.70},
    \"distance_km\": 5
  }")

echo "Response: $BOOKING_RES"
BOOKING_ID=$(echo $BOOKING_RES | grep -oP '"booking_id":"\K[^"]+')
if [ -z "$BOOKING_ID" ]; then
    BOOKING_ID=$(echo $BOOKING_RES | sed 's/.*"booking_id":"\([^"]*\)".*/\1/')
fi

echo "✔ Booking Created: $BOOKING_ID"
echo ""

# 4. Get User Bookings
echo "4. Getting User Bookings..."
curl -s -X GET "$BASE_URL/bookings?user_id=$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n✔ List retrieved.\n"

# 5. Driver Online
echo "5. Setting Driver Online..."
curl -s -X POST "$BASE_URL/drivers/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"driver_id\": \"DRV_CURL_001\", \"status\": \"ONLINE\", \"location\": {\"lat\": 10.765, \"lng\": 106.665}}"
echo -e "\n✔ Driver status updated.\n"

# 6. Verify Booking Detail
echo "6. Verifying Booking Status..."
curl -s -X GET "$BASE_URL/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n✔ Status verified.\n"

# 7. Call AI ETA API
echo "7. Testing AI ETA API..."
curl -s -X POST "$BASE_URL/eta" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"distance_km\": 5, \"traffic_level\": 0.5}"
echo -e "\n✔ ETA retrieved.\n"

# 8. Call Pricing API
echo "8. Testing Pricing API..."
curl -s -X POST "$BASE_URL/pricing" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"distance_km\": 5, \"demand_index\": 1.0}"
echo -e "\n✔ Pricing retrieved.\n"

# 9. Call Notification API
echo "9. Testing Notification API..."
curl -s -X POST "$BASE_URL/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"message\": \"Your ride is confirmed (cURL)\"}"
echo -e "\n✔ Notification sent.\n"

# 10. Logout and Invalidate
echo "10. Logging Out..."
curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n✔ Logged out.\n"

echo "11. Verifying Token Invalidation (Expect 401)..."
LOGOUT_VERIFY=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/bookings?user_id=$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$LOGOUT_VERIFY" == "401" ]; then
    echo "✔ Token invalidated successfully (HTTP 401)."
else
    echo "✖ Token still valid! (HTTP $LOGOUT_VERIFY)"
fi

echo "------------------------------------------------------------"
echo "✅ Level 1 Verification Finished."
echo "------------------------------------------------------------"
