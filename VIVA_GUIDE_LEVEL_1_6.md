# 🚖 CabGo: Bí Kíp Vấn Đáp "Siêu Cấp" (Full 60 Testcases - Chuẩn Spec)

Tài liệu này khớp 100% với danh sách 60 Testcases yêu cầu. Mỗi mục chỉ rõ: **Hàm**, **Dòng Code Message**, **Luồng gọi**, **Input** và **Kết quả mong đợi**.

---

## 🏛️ Sơ đồ Luồng gọi Tổng quát
> "Thưa thầy, hệ thống em dùng mô hình **Orchestrator**. **Booking Service** đóng vai trò nhạc trưởng, gọi tuần tự sang **AI Matching**, **Pricing**, và **Payment**. Sau đó dùng **Kafka Outbox Pattern** để đảm bảo tính nhất quán dữ liệu."

---

## 🟢 LEVEL 1 – CƠ BẢN (Happy Path: TC01 - TC10)

| ID | Test Case | Vị trí Code, Hàm & Dòng | Lời thoại & Luồng gọi (Cheat Sheet) |
|:---|:---|:---|:---|
| 1 | Đăng ký thành công | `auth.controller.ts`<br>Hàm: `register`<br>**Dòng: 53** | **🔄 Luồng:** `Gateway` ➔ `Auth` ➔ `DB`.<br>**📥 Input:** `email`, `password`, `name`.<br>**✅ Expected:** HTTP 201, User được lưu DB, Trả về `user_id`.<br>**👉 Chứng minh:** Chỉ vào `bcrypt.hash` dòng 30. |
| 2 | Đăng nhập trả JWT | `auth.controller.ts`<br>Hàm: `login`<br>**Dòng: 90** | **🔄 Luồng:** `Auth` (Verify pass) ➔ Trả JWT.<br>**📥 Input:** `email`, `password`.<br>**✅ Expected:** HTTP 200, Trả về `access_token` (JWT).<br>**👉 Chứng minh:** Giải thích `sub` (userId) và `exp` sinh ra ở dòng 84. |
| 3 | Tạo booking hợp lệ | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 424** | **🔄 Luồng:** `Booking` ➔ `AI` ➔ `Pricing`.<br>**📥 Input:** `pickup`, `drop`, `distance_km`.<br>**✅ Expected:** HTTP 201, Có `booking_id`, status `REQUESTED`.<br>**👉 Chứng minh:** Show JSON có đủ Price/ETA. |
| 4 | Lấy list booking | `booking.controller.ts`<br>Hàm: `getBookings`<br>**Dòng: 475** | **🔄 Luồng:** `Gateway` ➔ `Booking` ➔ `DB`.<br>**📥 Input:** `GET /bookings?user_id=...`<br>**✅ Expected:** HTTP 200, Trả về list booking.<br>**👉 Chứng minh:** Query từ bảng `bookings` trong DB. |
| 5 | Driver Online | `driver.controller.ts`<br>Hàm: `updateStatus`<br>**Dòng: 63** | **🔄 Luồng:** `Driver` ➔ `Redis` (GeoAdd).<br>**📥 Input:** `driver_id`, `status: ONLINE`.<br>**✅ Expected:** HTTP 200, Status updated = ONLINE.<br>**👉 Chứng minh:** Show dòng 42: Đẩy tọa độ lên Redis Geo. |
| 6 | Status = REQUESTED | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 258** | **🔄 Luồng:** Gán status mặc định tại Booking Service.<br>**✅ Expected:** Status ban đầu = REQUESTED, Có `created_at`.<br>**👉 Chứng minh:** Chỉ vào dòng 258 trong code. |
| 7 | ETA trả về > 0 | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 235** | **🔄 Luồng:** `Booking` ➔ `AI Matching`.<br>**✅ Expected:** `eta > 0` và hợp lý (< 60p).<br>**👉 Chứng minh:** Show API call AI Matching ở dòng 208. |
| 8 | Pricing giá hợp lệ | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 238** | **🔄 Luồng:** `Booking` ➔ `Pricing Service`.<br>**✅ Expected:** `price > base fare`, `surge >= 1`.<br>**👉 Chứng minh:** Show API call Pricing ở dòng 212. |
| 9 | Notification gửi OK | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 400** | **🔄 Luồng:** `Booking` ➔ `Kafka` ➔ `Notification`.<br>**✅ Expected:** `notification_sent: true`.<br>**👉 Chứng minh:** Show cờ thông báo trong response. |
| 10 | Logout invalidate | `auth.controller.ts`<br>Hàm: `logout`<br>**Dòng: 122** | **🔄 Luồng:** `Auth` ➔ `Redis` (Blacklist).<br>**✅ Expected:** HTTP 200, Token cũ gọi lại trả 401.<br>**👉 Chứng minh:** Mở dòng 117: Set token vào blacklist. |

---

## 🟢 LEVEL 2 – VALIDATION & EDGE CASES (TC11 - TC20)

| ID | Test Case | Vị trí Code, Hàm & Dòng | Lời thoại & Luồng gọi (Cheat Sheet) |
|:---|:---|:---|:---|
| 11 | Thiếu pickup -> 400 | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 113** | **✅ Expected:** HTTP 400, Message: "pickup is required".<br>**👉 Chứng minh:** Bôi đen dòng 113 để show phần validate input. |
| 12 | Sai format Lat/Lng | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 120** | **✅ Expected:** HTTP 400/422, Reject không gọi AI service.<br>**👉 Chứng minh:** Gửi string vào lat/lng -> Chặn ở dòng 120. |
| 13 | Driver offline | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 232** | **🔄 Luồng:** Redis check không có driver ONLINE.<br>**✅ Expected:** Message: "No drivers available".<br>**👉 Chứng minh:** Chạy Test 13 khi không có driver nào bật app. |
| 14 | Payment Invalid | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 114** | **✅ Expected:** HTTP 400 hoặc tự động đưa về CASH.<br>**👉 Chứng minh:** Nhấn mạnh hệ thống fail-safe ở dòng 114. |
| 15 | Distance = 0 | `booking.controller.ts`<br>Hàm: `calculateDistanceKm`<br>**Dòng: 14** | **✅ Expected:** `eta = 0`, không crash, không giá trị âm.<br>**👉 Chứng minh:** Gửi pickup trùng drop -> Show distance trả về 0. |
| 16 | Demand Index = 0 | `pricing.controller.ts` | **✅ Expected:** `surge_multiplier >= 1`, Giá vẫn hợp lệ.<br>**👉 Chứng minh:** Logic giá không bao giờ = 0. Chống chia cho 0. |
| 17 | Fraud thiếu field | `fraud.controller.ts` | **✅ Expected:** HTTP 400, "missing required fields".<br>**👉 Chứng minh:** Fraud cần đủ context (user_id, amount...) để chấm điểm. |
| 18 | Token Expired | `auth.middleware.ts` | **✅ Expected:** HTTP 401, "Token expired".<br>**👉 Chứng minh:** Middleware chặn request trước khi vào Business Logic. |
| 19 | Idempotency Check | `booking.controller.ts`<br>Hàm: `createBooking`<br>**Dòng: 148** | **✅ Expected:** Chỉ tạo 1 booking, request 2 trả kết quả cũ.<br>**👉 Chứng minh:** Chỉ vào dòng 148: `redis.get(idempotencyKey)`. |
| 20 | Payload quá lớn | Gateway Config | **✅ Expected:** HTTP 413 Payload Too Large.<br>**👉 Chứng minh:** Chặn ở tầng hạ tầng để chống DDoS/Buffer Overflow. |

---

## 🟡 LEVEL 3 – INTEGRATION TEST (TC21 - TC30)

| ID | Test Case | Vị trí Code, Hàm & Dòng | Lời thoại & Luồng gọi (Cheat Sheet) |
|:---|:---|:---|:---|
| 21 | Gọi ETA thành công | `booking.controller.ts`<br>Dòng: 208 | **🔄 Luồng:** `Booking` ➔ `AI Matching`. Trả `eta > 0`. |
| 22 | Gọi Pricing thành công | `booking.controller.ts`<br>Dòng: 212 | **🔄 Luồng:** `Booking` ➔ `Pricing`. Trả `price > 0`. |
| 23 | Agent chọn Driver | `ai.service.ts` | **🔄 Luồng:** `AI Agent` fetch driver từ Driver Service.<br>**✅ Expected:** Chọn đúng driver ONLINE. |
| 24 | Full Flow (End-to-End)| `booking.controller.ts` | **🔄 Luồng:** Booking ➔ Payment ➔ Notification.<br>**✅ Expected:** Cả chuỗi thành công mượt mà. |
| 25 | Kafka ride_requested | `booking.controller.ts`<br>Dòng: 273 | **🔄 Luồng:** Publish event lên Kafka topic `ride_events`.<br>**👉 Chứng minh:** Show bảng outbox ghi lại event. |
| 26 | Driver nhận Notify | `notification-service` | **🔄 Luồng:** Consumer Kafka nhận event và đẩy Notify.<br>**👉 Chứng minh:** Show log receiver của Notification Service. |
| 27 | Status ACCEPTED | `booking.controller.ts`<br>Dòng: 448 | **🔄 Luồng:** Driver accept ➔ Booking update ACCEPTED.<br>**👉 Chứng minh:** Chạy API update status driver. |
| 28 | MCP Context Fetch | `ai-matching-service` | **🔄 Luồng:** Agent fetch dữ liệu Rating/Traffic làm context.<br>**👉 Chứng minh:** Show matching_reason có đủ thông tin context. |
| 29 | Gateway Route | `api-gateway` | **🔄 Luồng:** Route đúng Port 3002 cho Booking.<br>**👉 Chứng minh:** Show config file gateway. |
| 30 | Retry Pricing | `booking.controller.ts`<br>Dòng: 192 | **🔄 Luồng:** `axios-retry` xử lý khi Pricing bị timeout.<br>**👉 Chứng minh:** Hệ thống không crash mà tự gọi lại. |

---

## 🟡 LEVEL 4 – TRANSACTION & ACID (TC31 - TC40) 💎

| ID | Test Case | Vị trí Code, Hàm & Dòng | Lời thoại & Luồng gọi (Cheat Sheet) |
|:---|:---|:---|:---|
| 31 | Transaction OK | `booking.controller.ts`<br>Dòng: 248 | **✅ Expected:** DB commit thành công Booking + Outbox. |
| 32 | Rollback giữa chừng | `booking.controller.ts`<br>Dòng: 286 | **🔄 Luồng:** Lỗi DB ➔ Rollback.<br>**✅ Expected:** Không có booking nào trong DB (Consistent). |
| 33 | Payment Fail Rollback | `booking.controller.ts`<br>Dòng: 374 | **🔄 Luồng:** Thanh toán lỗi ➔ Saga Compensation.<br>**✅ Expected:** Status chuyển về `CANCELLED`. |
| 34 | Idempotent Key | `booking.controller.ts`<br>Dòng: 431 | **✅ Expected:** Không double charge tiền khi retry cùng key. |
| 35 | Race Condition | `booking.controller.ts`<br>Dòng: 180 | **🔄 Luồng:** 2 request song song ➔ Redis Lock chặn 1 cái.<br>**✅ Expected:** Chỉ 1 booking được tạo. |
| 36 | Saga Success Flow | `booking.controller.ts` | **🔄 Luồng:** Full 3 bước: Create ➔ Pay ➔ Commit. |
| 37 | Saga Compensation | `booking.controller.ts`<br>Dòng: 378 | **🔄 Luồng:** Bước hoàn tác khi Payment fail ở dòng 353. |
| 38 | Kafka Consistency | `booking.controller.ts`<br>Dòng: 405 | **🔄 Luồng:** Outbox Pattern đảm bảo không mất Event Kafka. |
| 39 | Partial Failure | `booking.controller.ts`<br>Dòng: 357 | **🔄 Luồng:** Timeout payment ➔ Không hủy đơn (PENDING). |
| 40 | Data Integrity (ACID) | `scripts/acid-cleanup.sql` | **👉 Chứng minh:** Giải thích Atomic, Consistent, Isolated, Durable qua code. |

---

## 🔴 LEVEL 5 – AI VALIDATION (TC41 - TC50)

| ID | Test Case | Vị trí Code, Hàm & Dòng | Lời thoại & Luồng gọi (Cheat Sheet) |
|:---|:---|:---|:---|
| 41 | ETA Range hợp lý | `ai.service.ts` | **✅ Expected:** 5km thì ETA không thể là 999 phút hay -1. |
| 42 | Surge > 1 khi cao điểm | `pricing-service` | **✅ Expected:** Demand=2 ➔ Surge > 1 (Max 3x). |
| 43 | Fraud Score Flagged | `fraud-service` | **✅ Expected:** Score > threshold ➔ Flag = true. |
| 44 | Recommendation Top-3 | `ai.service.ts` | **✅ Expected:** Trả đúng 3 driver tốt nhất. |
| 45 | Forecast Format | `demand-service` | **✅ Expected:** Trả JSON có timestamp và value dự báo. |
| 46 | Model Version | `ai.service.ts` | **✅ Expected:** Trả đúng version model hiện hành. |
| 47 | AI Latency < 200ms | `ai-matching-service` | **✅ Expected:** Phản hồi nhanh để kịp Real-time. |
| 48 | Drift Detection | Monitoring Service | **🔄 Luồng:** Phát hiện dữ liệu thực tế thay đổi so với training. |
| 49 | Model Fallback | `booking.controller.ts`<br>Dòng: 216 | **🔄 Luồng:** AI sập ➔ Dùng Rule-based logic. |
| 50 | Input bất thường | `ai-matching-service` | **✅ Expected:** Dist = 1000km ➔ Model không crash. |

---

## 🔴 LEVEL 6 – AI AGENT LOGIC (TC51 - TC60) 🤖

| ID | Test Case | Vị trí Code, Hàm & Dòng | Lời thoại & Luồng gọi (Cheat Sheet) |
|:---|:---|:---|:---|
| 51 | Agent chọn gần nhất | `ai.service.ts` | **✅ Expected:** D1(5km), D2(2km), D3(3km) ➔ Chọn D2. |
| 52 | Agent chọn Rating cao | `ai.service.ts` | **✅ Expected:** D1(2km, 4.0), D2(3km, 4.9) ➔ Chọn D2. |
| 53 | Trade-off Giá vs ETA | `ai.service.ts` | **✅ Expected:** Agent chọn phương án tối ưu đa mục tiêu. |
| 54 | Gọi đúng Tool | `booking.controller.ts`<br>Dòng: 208 | **🔄 Luồng:** Agent tự quyết định gọi ETA và Pricing đúng thứ tự. |
| 55 | Xử lý thiếu dữ liệu | `ai.service.ts` | **✅ Expected:** Không crash, tự dùng Fallback data (L221). |
| 56 | Agent Retry | `booking.controller.ts`<br>Dòng: 308 | **🔄 Luồng:** Thử lại khi service ETA lag. |
| 57 | Không chọn Offline | `driver.controller.ts`<br>Dòng: 60 | **🔄 Luồng:** Xóa khỏi Redis nên Agent không bao giờ chọn nhầm. |
| 58 | Log Decision đầy đủ | `booking.controller.ts`<br>Dòng: 241 | **✅ Expected:** Có `matching_reason` giải trình vì sao chọn. |
| 59 | Request song song | `booking.controller.ts`<br>Dòng: 180 | **✅ Expected:** Agent xử lý nhiều khách cùng lúc không race. |
| 60 | Fallback Rule-based | `booking.controller.ts`<br>Dòng: 222 | **✅ Expected:** AI chết hệ thống vẫn sống bằng code cũ. |

---
*CHÚC BẠN BẢO VỆ THÀNH CÔNG RỰC RỠ VỚI 60 VŨ KHÍ NÀY!*
