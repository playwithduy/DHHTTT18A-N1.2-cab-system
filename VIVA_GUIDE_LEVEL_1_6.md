# 🚖 CabGo: VIVA Master Guide (Level 1 - Level 6)
## Hướng dẫn chi tiết 60 Test Cases cho Hội đồng Chấm thi

Tài liệu này cung cấp hướng dẫn thực hiện, tham chiếu mã nguồn và kết quả kỳ vọng cho toàn bộ 60 Test Cases (TC) từ Level 1 đến Level 6 của hệ thống CabGo.

---

## 🏛️ Tổng quan Kiến trúc (High-Level)
Hệ thống sử dụng mô hình **Microservices** với **API Gateway** là cửa ngõ duy nhất. Quy trình đặt xe được điều phối bởi **Booking Service** (Orchestrator) kết hợp với **Agentic AI** để đưa ra quyết định chọn tài xế tối ưu.

---

## 🟢 LEVEL 1: HAPPY PATH (TC 01 - TC 10)
*Mục tiêu: Đảm bảo các luồng cơ bản hoạt động trơn tru.*

### TC 01: Đăng ký thành công (Register)
- **Postman:** `POST {{GATEWAY_URL}}/auth/register`
- **Body:** `{ "email": "user1@gmail.com", "password": "password123", "name": "User One" }`
- **Logic:** Mã hóa password bằng `bcrypt` và lưu vào bảng `User`.
- **Code:** [auth.controller.ts:56](file:///e:/Cab-booking/backend/microservices/auth-service/src/controllers/auth.controller.ts#L56)
- **Kết quả:** Trả về `201 Created`, Log: `[POSTMAN LEVEL 1] TEST 1: SUCCESS`.

### TC 02: Đăng nhập trả JWT (Login)
- **Postman:** `POST {{GATEWAY_URL}}/auth/login`
- **Body:** `{ "email": "user1@gmail.com", "password": "password123" }`
- **Logic:** So khớp hash password, ký JWT token chứa `userId` và `role`.
- **Code:** [auth.controller.ts:97](file:///e:/Cab-booking/backend/microservices/auth-service/src/controllers/auth.controller.ts#L97)
- **Kết quả:** Trả về `200 OK` kèm `access_token`.

### TC 03: Tạo booking hợp lệ (Create Booking)
- **Postman:** `POST {{GATEWAY_URL}}/bookings`
- **Headers:** `Authorization: Bearer {{token}}`
- **Body:** `{ "pickup": {"lat": 10.7, "lng": 106.6}, "drop": {"lat": 10.8, "lng": 106.7} }`
- **Logic:** Khởi động quy trình Orchestration (Gọi Pricing -> AI Matching).
- **Code:** [booking.controller.ts:113](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L113)
- **Kết quả:** Trả về `201 Created`, trạng thái `REQUESTED`.

### TC 04: Lấy danh sách Booking (Get List)
- **Postman:** `GET {{GATEWAY_URL}}/bookings`
- **Logic:** Truy vấn danh sách cuốc xe của user hiện tại từ Database.
- **Code:** [booking.controller.ts:613](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L613)
- **Kết quả:** Trả về mảng các bookings.

### TC 05: Tài xế Online (Driver Status)
- **Postman:** `PATCH {{GATEWAY_URL}}/drivers/status`
- **Body:** `{ "status": "ONLINE", "lat": 10.7, "lng": 106.6 }`
- **Logic:** Lưu trạng thái vào DB và đồng bộ tọa độ vào **Redis Geo** để tìm kiếm nhanh.
- **Code:** [driver.controller.ts:60](file:///e:/Cab-booking/backend/microservices/driver-service/src/controllers/driver.controller.ts#L60)
- **Kết quả:** `200 OK`, Log: `Driver now ONLINE and synced to Redis Geo`.

### TC 06: Trạng thái ban đầu = REQUESTED
- **Logic:** Mọi cuốc xe mới tạo (không lỗi thanh toán) phải có status `REQUESTED`.
- **Code:** [booking.controller.ts:536](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L536)
- **Kết quả:** `data.status === "REQUESTED"` trong response JSON.

### TC 07: ETA trả về > 0 (Estimated Time)
- **Logic:** AI Matching Service tính toán thời gian dựa trên khoảng cách và vận tốc.
- **Code:** [booking.controller.ts:328](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L328)
- **Kết quả:** JSON có trường `driver_eta` (ví dụ: `5` phút).

### TC 08: Giá hợp lệ (Pricing)
- **Logic:** Pricing Service tính toán dựa trên `Base Fare + (Distance * Rate)`.
- **Code:** [booking.controller.ts:329](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L329)
- **Kết quả:** JSON có trường `price` (ví dụ: `35000`).

### TC 09: Flag thông báo thành công (Notification)
- **Logic:** Booking Service đánh dấu `notificationSent: true` sau khi đẩy event.
- **Code:** [booking.controller.ts:537](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L537)
- **Kết quả:** Kiểm tra response có `notification_sent: true`.

### TC 10: Logout (Blacklist Token)
- **Postman:** `POST {{GATEWAY_URL}}/auth/logout`
- **Logic:** Đưa JWT vào Redis Blacklist với TTL bằng thời gian hết hạn còn lại của token.
- **Code:** [auth.controller.ts:130](file:///e:/Cab-booking/backend/microservices/auth-service/src/controllers/auth.controller.ts#L130)
- **Kết quả:** Token cũ không thể sử dụng để gọi API tiếp theo.

---

## 🟢 LEVEL 2: VALIDATION & EDGE CASES (TC 11 - TC 20)
*Mục tiêu: Xử lý dữ liệu sai và các tình huống biên.*

### TC 11: Thiếu trường bắt buộc (Zod Validation)
- **Postman:** `POST {{GATEWAY_URL}}/bookings` | Body: `{}` (Rỗng)
- **Logic:** Middleware dùng Zod parse body, phát hiện thiếu `pickup`/`drop`.
- **Code:** [validate.middleware.ts:34](file:///e:/Cab-booking/backend/microservices/booking-service/src/middleware/validate.middleware.ts#L34)
- **Kết quả:** `400 Bad Request`, message chi tiết lỗi field.

### TC 12: Tọa độ sai format
- **Body:** `{ "pickup": {"lat": "abc", "lng": 106} }`
- **Logic:** Kiểm tra kiểu dữ liệu tọa độ phải là `number`.
- **Code:** [validate.middleware.ts:72](file:///e:/Cab-booking/backend/microservices/booking-service/src/middleware/validate.middleware.ts#L72)
- **Kết quả:** `422 Unprocessable Entity`.

### TC 13: Không có tài xế Online (No Drivers)
- **Kịch bản:** Chỉnh tất cả tài xế về `OFFLINE`.
- **Logic:** Booking Service gọi sang Driver Service, nhận mảng rỗng -> Trả về thông báo nhẹ nhàng.
- **Code:** [booking.controller.ts:290](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L290)
- **Kết quả:** `200 OK`, message: `No drivers available`.

### TC 14: Phương thức thanh toán không hỗ trợ
- **Body:** `{ ..., "payment_method": "BITCOIN" }`
- **Logic:** Chặn ngay tại middleware nếu không thuộc `CASH` hoặc `CARD`.
- **Code:** [validate.middleware.ts:64](file:///e:/Cab-booking/backend/microservices/booking-service/src/middleware/validate.middleware.ts#L64)
- **Kết quả:** `400 Bad Request`.

### TC 15: Khoảng cách = 0 (Pickup trùng Drop)
- **Body:** `{ "pickup": {"lat": 10, "lng": 10}, "drop": {"lat": 10, "lng": 10} }`
- **Logic:** Hàm `calculateDistanceKm` xử lý an toàn trả về 0, hệ thống không crash.
- **Code:** [booking.controller.ts:133](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L133)
- **Kết quả:** Booking vẫn được tạo với `distance_km: 0`.

### TC 16: Demand Index = 0 (Pricing Base)
- **Logic:** Dù nhu cầu cực thấp, giá vẫn không bao giờ dưới mức `Base Fare`.
- **Code:** [pricing-service/src/index.ts:29](file:///e:/Cab-booking/backend/microservices/pricing-service/src/index.ts#L29)
- **Kết quả:** Log xác nhận sử dụng giá sàn.

### TC 17: Fraud Service thiếu field
- **Postman:** `POST {{GATEWAY_URL}}/fraud/check` | Body thiếu `amount`.
- **Logic:** Fraud Service tự validate đầu vào để tránh xử lý dữ liệu rác.
- **Code:** [fraud-service/src/index.ts:55](file:///e:/Cab-booking/backend/microservices/fraud-service/src/index.ts#L55)
- **Kết quả:** `400 Bad Request`.

### TC 18: Token hết hạn (Expired)
- **Thực hiện:** Sử dụng token có giá trị `expired_token` để test.
- **Logic:** API Gateway middleware kiểm tra tính hợp lệ và thời hạn của token.
- **Code:** [api-gateway/src/middleware/auth.ts:38](file:///e:/Cab-booking/backend/api-gateway/src/middleware/auth.ts#L38)
- **Kết quả:** `401 Unauthorized`, message: `Token expired`.

### TC 19: Idempotency Key (Chống đặt trùng)
- **Headers:** `x-idempotency-key: unique-123`
- **Thực hiện:** Gửi 2 request giống hệt nhau liên tiếp với cùng Key.
- **Logic:** Redis lưu kết quả của request đầu tiên, trả về ngay cho request thứ 2.
- **Code:** [booking.controller.ts:184](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L184)
- **Kết quả:** Cả 2 request đều nhận cùng `booking_id`, Log: `Idempotency hit`.

### TC 20: Payload quá lớn (Security)
- **Thực hiện:** Gửi request body có kích thước > 1MB.
- **Logic:** Gateway giới hạn `json limit` để tránh tấn công DoS.
- **Code:** [api-gateway/src/index.ts:42](file:///e:/Cab-booking/backend/api-gateway/src/index.ts#L42)
- **Kết quả:** `413 Payload Too Large`.

---

## 🟡 LEVEL 3: INTEGRATION & ARCHITECTURE (TC 21 - TC 30)
*Mục tiêu: Kiểm tra sự phối hợp giữa các Microservices.*

### TC 21: Gọi AI Matching thành công
- **Logic:** Booking Service gọi sang AI Service qua HTTP nội bộ.
- **Code:** [booking.controller.ts:259](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L259)
- **Kết quả:** Log: `Integration call to AI Matching/ETA successful`.

### TC 22: Chống trùng lặp nghiệp vụ (Business Idempotency)
- **Logic:** Nếu cùng một User đặt 2 cuốc tại cùng vị trí trong vòng 5 phút, hệ thống tự nhận diện là trùng.
- **Code:** [booking.controller.ts:209](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L209)
- **Kết quả:** Trả về cuốc xe hiện có thay vì tạo mới.

### TC 23: Agent chấm điểm tài xế
- **Logic:** AI Agent fetch tài xế từ Redis Geo và áp dụng Scoring Model.
- **Code:** [agent.orchestrator.ts:156](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L156)
- **Kết quả:** Log chi tiết quá trình chấm điểm ứng viên.

### TC 24: Luồng Full E2E (Happy Path)
- **Luồng:** Gateway -> Booking -> (Pricing & AI Matching) -> Payment -> Notification.
- **Code:** [booking.controller.ts:249](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L249)
- **Kết quả:** Booking kết thúc với trạng thái `REQUESTED` và thanh toán thành công.

### TC 25: Transactional Outbox Pattern
- **Logic:** Lưu Booking và Message vào DB trong cùng 1 Transaction để đảm bảo không mất event.
- **Code:** [booking.controller.ts:524](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L524)
- **Kết quả:** Log xác nhận event đã được lưu vào bảng `Outbox`.

### TC 26: Kafka Notification Consumer
- **Logic:** Notification Service lắng nghe Kafka topic `ride_events` để gửi thông báo.
- **Code:** [notification-service/src/index.ts:33](file:///e:/Cab-booking/backend/microservices/notification-service/src/index.ts#L33)
- **Kết quả:** Log: `Kafka Notification Consumer: Received event`.

### TC 27: Cập nhật status = ACCEPTED
- **Postman:** `PATCH {{GATEWAY_URL}}/bookings/:id` | Body: `{ "status": "ACCEPTED" }`
- **Logic:** Tài xế chấp nhận cuốc xe, cập nhật trạng thái đồng bộ.
- **Code:** [booking.controller.ts:572](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L572)
- **Kết quả:** `200 OK`, status chuyển sang `ACCEPTED`.

### TC 28: Agent lấy Context (Extended Data)
- **Logic:** Agent lấy thêm thông tin Rating, Traffic từ DB/Redis để làm input cho AI.
- **Code:** [agent.orchestrator.ts:157](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L157)
- **Kết quả:** Log: `Agent retrieved extended context (Rating/Traffic)`.

### TC 29: Gateway Route Matching
- **Logic:** Gateway điều hướng đúng request `/bookings` vào Booking Service.
- **Code:** [api-gateway/src/index.ts:73](file:///e:/Cab-booking/backend/api-gateway/src/index.ts#L73)
- **Kết quả:** Log: `Gateway Route successful`.

### TC 30: Chiến lược Retry (Exponential Backoff)
- **Logic:** Nếu Pricing Service bị lag, Booking Service tự động thử lại với thời gian chờ tăng dần.
- **Code:** [booking.controller.ts:268](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L268)
- **Kết quả:** Log xác nhận call thành công sau khi retry.

---

## 💎 LEVEL 4: TRANSACTION & ACID (TC 31 - TC 40)
*Mục tiêu: Đảm bảo tính toàn vẹn dữ liệu cực cao.*

### TC 31: DB Transaction thành công (ACID)
- **Logic:** Cả Booking và Outbox message được commit đồng thời.
- **Code:** [booking.controller.ts:388](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L388)
- **Kết quả:** Dữ liệu xuất hiện đầy đủ trong cả 2 bảng.

### TC 32: Rollback khi lỗi DB
- **Thực hiện:** Body: `{ "simulate_db_error": true }`
- **Logic:** Nếu lỗi xảy ra sau khi tạo Booking nhưng trước khi commit Outbox -> Rollback toàn bộ.
- **Code:** [booking.controller.ts:383](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L383)
- **Kết quả:** Không có dòng dữ liệu nào được lưu vào DB (ACID chuẩn).

### TC 33: Saga Compensation (Hủy cuốc khi thanh toán lỗi)
- **Thực hiện:** Body: `{ "payment_method": "CARD", "simulate_payment_failure": true }`
- **Logic:** Thanh toán thẻ thất bại -> Tự động cập nhật status Booking về `CANCELLED`.
- **Code:** [booking.controller.ts:489](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L489)
- **Kết quả:** Response trả về lỗi 400 kèm status `CANCELLED`.

### TC 34: Idempotent Payment (Tránh trừ tiền 2 lần)
- **Logic:** Payment Service kiểm tra `booking_id` trước khi Charge tiền.
- **Code:** [payment-service/src/index.ts:194](file:///e:/Cab-booking/backend/microservices/payment-service/src/index.ts#L194)
- **Kết quả:** Log: `Payment already exists for booking`.

### TC 35: Race Condition Lock (Distributed Lock)
- **Thực hiện:** Body: `{ "simulate_race_condition": true }`
- **Logic:** Dùng Redis Lock để ngăn 2 request đồng thời từ cùng 1 User.
- **Code:** [booking.controller.ts:117](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L117)
- **Kết quả:** `409 Conflict`, message: `Another booking is in progress`.

### TC 36: Saga Full Success Flow
- **Logic:** Hoàn tất chuỗi: Đặt xe -> Thu tiền thẻ -> Phát hành event.
- **Code:** [booking.controller.ts:428](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L428)
- **Kết quả:** Log: `Saga Full Flow: Payment processed successfully`.

### TC 37: Saga Compensating Transaction
- **Logic:** Thực hiện bước hoàn tác (Compensation) khi một bước trong chuỗi Saga thất bại.
- **Code:** [booking.controller.ts:490](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L490)
- **Kết quả:** Log xác nhận `Saga Compensating Transaction executed`.

### TC 38: Kafka Data Consistency
- **Logic:** Outbox Worker đảm bảo mọi event trong DB đều được đẩy lên Kafka.
- **Code:** [booking.controller.ts:525](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L525)
- **Kết quả:** Event xuất hiện trên Kafka đúng thứ tự.

### TC 39: Partial Failure Recovery (Timeout Payment)
- **Thực hiện:** Body: `{ "simulate_payment_timeout": true }`
- **Logic:** Thanh toán bị timeout (không rõ thành công hay chưa) -> Để status `REQUESTED` nhưng đánh dấu `failureReason: PAYMENT_TIMEOUT` để xử lý sau.
- **Code:** [booking.controller.ts:475](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L475)
- **Kết quả:** Booking vẫn được tạo nhưng kèm cảnh báo Timeout.

### TC 40: ACID Cleanup Script
- **Kịch bản:** Chạy SQL script để kiểm tra các bản ghi rác từ các cuộc test rollback.
- **Code:** `scripts/acid-cleanup.sql` (Chạy tay hoặc trigger tự động).

---

## 🔴 LEVEL 5: AI VALIDATION & FRAUD (TC 41 - TC 50)
*Mục tiêu: Đưa trí tuệ nhân tạo và an toàn tài chính vào hệ thống.*

### TC 41: ETA model output trong range hợp lý
- **Postman:** `POST {{GATEWAY_URL}}/eta`
- **Body:** `{ "distance_km": 5, "traffic_level": 0.5 }`
- **Logic:** Kiểm tra kết quả ETA từ AI model nằm trong khoảng hợp lý (eta > 0 và eta < 60 phút). Model không được trả giá trị vô lý.
- **Code:** [agent.orchestrator.ts:158](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L158)
- **Kết quả:** `eta > 0`, `eta < 60`. Không trả giá trị âm hoặc bất hợp lý.

### TC 42: Surge Pricing khi cao điểm
- **Logic:** Tự động áp dụng `Surge Multiplier` khi nhu cầu (demand_index) tăng cao.
- **Code:** [pricing-service/src/index.ts:37](file:///e:/Cab-booking/backend/microservices/pricing-service/src/index.ts#L37)
- **Kết quả:** Giá tăng so với bình thường, có tag `surge_multiplier > 1.0`.

### TC 43: Fraud Detection (Phát hiện gian lận)
- **Thực hiện:** Đặt xe với số tiền > 10,000,000đ.
- **Logic:** Fraud Service đánh dấu `is_fraud: true` dựa trên ngưỡng giao dịch.
- **Code:** [fraud-service/src/index.ts:34](file:///e:/Cab-booking/backend/microservices/fraud-service/src/index.ts#L34)
- **Kết quả:** Hệ thống log cảnh báo gian lận.

### TC 44: Recommendation Top-3 (Đề xuất)
- **Logic:** Ngoài tài xế thắng cuộc, AI trả về danh sách 2 người tiềm năng tiếp theo.
- **Code:** [agent.orchestrator.ts:179](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L179)
- **Kết quả:** JSON có mảng `topDrivers` với 3 phần tử.

### TC 45: Forecast Demand (Dự báo nhu cầu)
- **Logic:** Agent phân tích dữ liệu lịch sử để dự báo khu vực sắp có nhu cầu cao.
- **Code:** [agent.orchestrator.ts:180](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L180)
- **Kết quả:** Log: `Forecast Demand logic executed`.

### TC 46: Model Versioning (Quản lý phiên bản AI)
- **Logic:** Gắn tag phiên bản Model vào response để phục vụ việc giám sát A/B Testing.
- **Code:** [fraud-service/src/index.ts:47](file:///e:/Cab-booking/backend/microservices/fraud-service/src/index.ts#L47)
- **Kết quả:** Response JSON có trường `model_version: "v1.2.0"`.

### TC 47: AI Inference Latency < 200ms
- **Logic:** Đo lường thời gian xử lý của Agent đảm bảo trải nghiệm người dùng.
- **Code:** [agent.orchestrator.ts:159](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L159)
- **Kết quả:** Log hiển thị `latencyMs < 200`.

### TC 48: Drift Detection (Giám sát dữ liệu)
- **Logic:** So sánh phân phối dữ liệu đầu vào thực tế với dữ liệu lúc train model.
- **Vị trí:** Xem tại Monitoring Dashboard (Prometheus/Grafana).

### TC 49: AI Model Fallback (Khi AI sập)
- **Thực hiện:** Body: `{ "simulate_pricing_timeout": true }`
- **Logic:** Nếu AI Service không phản hồi -> Booking tự động dùng logic "Tài xế gần nhất" để cứu vãn.
- **Code:** [booking.controller.ts:271](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L271)
- **Kết quả:** Log: `AI/Pricing service failure. Using Rule-based Proximity Fallback`.

### TC 50: Xử lý tọa độ bất thường
- **Body:** `{ "distance_km": 1000 }` (Đi 1000km)
- **Logic:** Pricing Service từ chối các yêu cầu có tham số phi thực tế.
- **Code:** [pricing-service/src/index.ts:66](file:///e:/Cab-booking/backend/microservices/pricing-service/src/index.ts#L66)
- **Kết quả:** `400 Bad Request`.

---

## 🤖 LEVEL 6: AGENTIC AI (TC 51 - TC 60)
*Mục tiêu: Agent tự chủ và tối ưu đa mục tiêu.*

### TC 51: Ưu tiên Chất lượng (Priority: Quality)
- **Body:** `{ ..., "priority": "quality" }`
- **Logic:** Agent tăng trọng số cho Rating (0.7) và giảm trọng số Distance.
- **Code:** [agent.orchestrator.ts:114](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L114)
- **Kết quả:** Ưu tiên tài xế 5 sao dù ở xa hơn một chút.

### TC 52: Ưu tiên Tốc độ (Priority: Speed)
- **Body:** `{ ..., "priority": "speed" }`
- **Logic:** Agent tăng trọng số cho ETA (0.7) để tài xế đến nhanh nhất.
- **Code:** [agent.orchestrator.ts:116](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L116)
- **Kết quả:** Chọn tài xế gần nhất bất kể rating.

### TC 53: Tối ưu đa mục tiêu (Multi-objective Balanced)
- **Body:** `{ ..., "priority": "balanced" }`
- **Logic:** Cân bằng giữa Giá, Tốc độ và Chất lượng xe.
- **Code:** [agent.orchestrator.ts:118](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L118)
- **Kết quả:** Log: `Multi-objective Balanced Scoring active`.

### TC 54: Agent tự gọi Tool (Tool Calling)
- **Logic:** Agent tự quyết định gọi Tool Pricing để lấy giá thực tế thay vì dùng giá fix.
- **Code:** [agent.orchestrator.ts:97](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L97)
- **Kết quả:** Log: `Agent autonomously called Pricing Tool`.

### TC 55: Xử lý thiếu dữ liệu (Imputation)
- **Kịch bản:** Một tài xế mới chưa có Rating.
- **Logic:** Agent tự gán Rating trung bình (4.5) để tài xế vẫn có cơ hội nhận cuốc.
- **Code:** [agent.orchestrator.ts:123](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L123)
- **Kết quả:** Tài xế mới vẫn được tham gia Scoring.

### TC 56: Agent Self-Retry (Tự thử lại)
- **Logic:** Nếu Tool gọi bị lỗi tạm thời, Agent tự thực hiện Retry Exponential.
- **Code:** [agent.orchestrator.ts:5](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L5)
- **Kết quả:** Log: `Agent self-retry triggered`.

### TC 57: Loại bỏ tài xế Offline ngay lập tức
- **Logic:** Trước khi chấm điểm, Agent lọc bỏ các tài xế không còn Online để tránh Match sai.
- **Code:** [driver.controller.ts:64](file:///e:/Cab-booking/backend/microservices/driver-service/src/controllers/driver.controller.ts#L64)
- **Kết quả:** `topDrivers` không bao giờ chứa tài xế Offline.

### TC 58: Giải trình lý do (Decision Reasoning)
- **Logic:** Agent trả về chuỗi văn bản giải thích tại sao tài xế này được chọn dựa trên đa mục tiêu.
- **Code:** [agent.orchestrator.ts:188](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L188)
- **Kết quả:** JSON có trường `reasoning` (VD: `[BALANCED] Rating=4.9...`) và `traceId` để truy vết xuyên suốt hệ thống.

### TC 59: Concurrent Request Handling
- **Logic:** Hệ thống xử lý hàng loạt request đặt xe đồng thời mà không bị tranh chấp tài xế (Race Condition).
- **Code:** [booking.controller.ts:222](file:///e:/Cab-booking/backend/microservices/booking-service/src/controllers/booking.controller.ts#L222)
- **Kết quả:** Log xác nhận Lock hoạt động dưới tải cao.

### TC 60: Rule-based Fallback (Proximity Selection)
- **Logic:** Khi AI Engine gặp sự cố (Model crash hoặc Force Fallback), hệ thống tự động hạ cấp xuống thuật toán "Gần nhất" thuần túy.
- **Code:** [agent.orchestrator.ts:205](file:///e:/Cab-booking/backend/microservices/ai-matching-service/src/agent.orchestrator.ts#L205)
- **Kết quả:** JSON có `isFallback: true`, `method: "PROXIMITY_FALLBACK"` và reasoning ghi rõ `FALLBACK: Using default rule-based...`.

---
*Lưu ý: Để xem Log trực tiếp khi test Postman, hãy sử dụng lệnh `docker-compose logs -f`.*
