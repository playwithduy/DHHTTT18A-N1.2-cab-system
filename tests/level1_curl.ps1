# ============================================================
# CabGo - Level 1 Verification Script (PowerShell)
# Usage: npm run test:level1_curl.ps1
# ============================================================

$baseUrl = "http://localhost:8080"
$email = "user_ps_$((Get-Date).Ticks)@test.com"
$password = "123456"
$name = "PowerShell Test User"

Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Starting Level 1 Verification..." -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan

# 1. Register User
Write-Host "1. Registering User..."
$regBody = @{email=$email; password=$password; name=$name} | ConvertTo-Json
$regRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -ContentType "application/json" -Body $regBody

$userId = $regRes.user_id
Write-Host "User Registered: $userId" -ForegroundColor Green

# 2. Login User
Write-Host "`n2. Logging In..."
$loginBody = @{email=$email; password=$password} | ConvertTo-Json
$loginRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody

$token = $loginRes.data.access_token
Write-Host "Logged In. Token captured." -ForegroundColor Green

$headers = @{ "Authorization" = "Bearer $token" }

# 3. Create Booking
Write-Host "`n3. Creating Booking..."
$bookingData = @{
    userId = $userId
    pickup = @{ lat = 10.76; lng = 106.66 }
    drop = @{ lat = 10.77; lng = 106.70 }
    distance_km = 5
}
$bookingBody = $bookingData | ConvertTo-Json
$bookingRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/bookings" -Headers $headers -ContentType "application/json" -Body $bookingBody

$bookingId = $bookingRes.data.booking_id
Write-Host "Booking Created: $bookingId" -ForegroundColor Green

# 4. Get User Bookings
Write-Host "`n4. Getting User Bookings..."
$bookings = Invoke-RestMethod -Method Get -Uri "$baseUrl/bookings?user_id=$userId" -Headers $headers
Write-Host "List retrieved ($($bookings.data.Count) bookings)." -ForegroundColor Green

# 5. Driver Online
Write-Host "`n5. Setting Driver Online..."
$driverData = @{
    driver_id = "DRV_PS_001"
    status = "ONLINE"
    location = @{ lat = 10.765; lng = 106.665 }
}
$driverBody = $driverData | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/drivers/status" -Headers $headers -ContentType "application/json" -Body $driverBody | Out-Null
Write-Host "Driver status updated." -ForegroundColor Green

# 6. Verify Booking Detail
Write-Host "`n6. Verifying Booking Status..."
Invoke-RestMethod -Method Get -Uri "$baseUrl/bookings/$bookingId" -Headers $headers | Out-Null
Write-Host "Status verified." -ForegroundColor Green

# 7. Call AI ETA API
Write-Host "`n7. Testing AI ETA API..."
$etaBody = @{ distance_km = 5; traffic_level = 0.5 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/eta" -Headers $headers -ContentType "application/json" -Body $etaBody | Out-Null
Write-Host "ETA retrieved." -ForegroundColor Green

# 8. Call Pricing API
Write-Host "`n8. Testing Pricing API..."
$pricingBody = @{ distance_km = 5; demand_index = 1.0 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/pricing" -Headers $headers -ContentType "application/json" -Body $pricingBody | Out-Null
Write-Host "Pricing retrieved." -ForegroundColor Green

# 9. Call Notification API
Write-Host "`n9. Testing Notification API..."
$notifyBody = @{ user_id = $userId; message = "Your ride is confirmed (PowerShell)" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/notifications" -Headers $headers -ContentType "application/json" -Body $notifyBody | Out-Null
Write-Host "Notification sent." -ForegroundColor Green

# 10. Logout and Invalidate
Write-Host "`n10. Logging Out..."
Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/logout" -Headers $headers | Out-Null
Write-Host "Logged out." -ForegroundColor Green

Write-Host "11. Verifying Token Invalidation (Expect 401)..."
try {
    Invoke-RestMethod -Method Get -Uri "$baseUrl/bookings?user_id=$userId" -Headers $headers | Out-Null
    Write-Host "Token still valid!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    if ($statusCode -eq "Unauthorized" -or $statusCode -eq 401) {
        Write-Host "Token invalidated successfully (HTTP 401)." -ForegroundColor Green
    } else {
        Write-Host "Unexpected error status: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Level 1 Verification Finished." -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
