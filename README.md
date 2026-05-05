# 🚖 CabGo — Hệ thống Đặt xe Microservices & AI Agent

Dự án này đã hoàn thành chứng chỉ hệ thống cấp độ **Level 6 (Resilience & AI Agent Certification)** với 60 Testcases đạt chuẩn ACID và tính sẵn sàng cao.

---

## 🏗️ Kiến trúc Microservices (Event-Driven & Saga)

Hệ thống được thiết kế theo mô hình Microservices phân tán, sử dụng **Saga Pattern (Orchestration)** để đảm bảo tính nhất quán dữ liệu.

*   **API Gateway (8080)**: Điểm tiếp nhận duy nhất, xử lý Bảo mật (JWT), Giới hạn lưu lượng (Rate Limiting).
*   **Booking Service (3002)**: Điều phối toàn bộ vòng đời chuyến xe. Quản lý **ACID Transactions**.
*   **AI Matching Service (3008)**: Sử dụng **Agentic AI** để ra quyết định chọn tài xế dựa trên đa mục tiêu (Speed, Quality, Balanced).
*   **Driver Service (3004)**: Quản lý vị trí thời gian thực bằng **Redis GeoIndex**.
*   **Payment Service (3005)**: Tích hợp thanh toán, hỗ trợ cơ chế Retry và Circuit Breaker.

---

## 📜 Danh mục Testcases & Đặc tả Kỹ thuật (Level 1 - 6)

Dưới đây là chi tiết 60 Testcases, bao gồm vị trí code và logic quyết định kết quả.

### 🟢 LEVEL 1 & 2: Core Logic & Security (TC01 - TC20)
*   **TC01 - TC05 (Khoảng cách & Giá)**: 
    *   **Code**: `backend/microservices/booking-service/src/controllers/booking.controller.ts` (L6-15).
    *   **Logic**: Sử dụng công thức Haversine để tính khoảng cách thực tế giữa các tọa độ GPS.
*   **TC11 - TC15 (Bảo mật JWT)**:
    *   **Code**: `backend/microservices/auth-service/src/middleware/auth.middleware.ts`.
    *   **Logic**: Kiểm tra chữ ký Bearer Token. Nếu không hợp lệ, Gateway sẽ chặn request ngay lập tức (Fail-fast).

### 🟡 LEVEL 3 & 4: ACID Compliance & Saga Pattern (TC21 - TC40)
*   **TC32 (Atomic - Toàn vẹn dữ liệu)**:
    *   **Mục tiêu**: Khi lỗi hệ thống xảy ra, dữ liệu không được kẹt ở trạng thái "dang dở".
    *   **Code**: `booking.controller.ts` (Dòng 248-292).
    *   **Xử lý**: Sử dụng `prisma.$transaction`. Nếu dòng 286 (`simulate_db_error`) kích hoạt, toàn bộ tiến trình tạo Booking sẽ bị Rollback.
*   **TC35 (Isolated - Chống đặt trùng)**:
    *   **Code**: `booking.controller.ts` (Dòng 180).
    *   **Kỹ thuật**: **Redis Distributed Lock**. Chỉ một request duy nhất của User được xử lý trong 30 giây.
*   **TC37 (Saga Compensation - Tự động hoàn tác)**:
    *   **Code**: `booking.controller.ts` (Dòng 378).
    *   **Logic**: Khi `payment-service` báo lỗi thẻ (Hard Failure), Booking Service tự động gọi lệnh UPDATE chuyển trạng thái sang `CANCELLED`.
*   **TC39 (Resilience - Khả năng chịu lỗi mạng)**:
    *   **Code**: `booking.controller.ts` (Dòng 357).
    *   **Logic**: Phân biệt Timeout và Failure. Nếu Timeout, hệ thống **không hủy** đơn hàng mà chuyển sang `PENDING` để kiểm tra lại sau (Recovery Mode), đảm bảo không mất doanh thu do mạng lag.
*   **TC40 (Consistency - Làm sạch dữ liệu)**:
    *   **Code**: `scripts/acid-cleanup.sql`.
    *   **Logic**: Đảm bảo mọi record `CANCELLED` phải có `cancelled_at`, mọi `SUCCESS` phải có `payment_id`.

### 🔴 LEVEL 5 & 6: AI Agent & Advanced Resilience (TC41 - TC60)
*   **TC51 - TC53 (AI Agent Reasoning)**:
    *   **Code**: `backend/microservices/ai-matching-service/src/backend/microservices/ai.service.ts`.
    *   **Logic**: Agent phân tích 4 tham số: Khoảng cách, Rating, Giá và Độ tin cậy (Reliability).
    *   **Decision**: 
        *   Priority **Speed**: Chọn driver gần nhất (Dòng code scoring AI).
        *   Priority **Quality**: Chọn driver có Rating 4.9+ dù xa hơn.
*   **TC57 (Exclusion logic)**:
    *   **Code**: `backend/microservices/driver-service/src/controllers/driver.controller.ts` (Dòng 60).
    *   **Xử lý**: Khi tài xế OFFLINE, lệnh `redis.zRem` sẽ xóa họ khỏi bản đồ tìm kiếm. AI Agent sẽ tự động loại bỏ họ ra khỏi danh sách ứng viên.
*   **TC58 (Decision Logging)**:
    *   **Mô tả**: Mọi quyết định của AI Agent đều được log kèm theo `matchingReason` (L260 trong Booking Controller) để phục vụ giải trình (Explainability).

---

## 🛠️ Công nghệ & Kỹ thuật Nâng cao

### 1. Circuit Breaker (Cầu dao điện)
*   **Vị trí**: `booking-service/src/utils/circuitBreaker.ts`.
*   **Tác dụng**: Nếu Pricing Service bị sập, hệ thống tự động ngắt kết nối và chuyển sang dùng giá mặc định (Local Fallback) thay vì để User chờ đợi.

### 2. Outbox Pattern
*   **Vị trí**: `booking.controller.ts` (Dòng 273).
*   **Tác dụng**: Đảm bảo Event được lưu vào DB cùng lúc với Booking. Ngay cả khi Kafka sập, dữ liệu sự kiện vẫn không bị mất.

### 3. Exponential Backoff (Retry Logic)
*   **Vị trí**: `booking.controller.ts` (Dòng 308).
*   **Tác dụng**: Tự động thử lại thanh toán sau 1s, 2s, 4s... khi gặp lỗi mạng.

---

## 🚀 Hướng dẫn Chạy Test (Postman)
1.  Import Collection `Level6_Tests.postman_collection.json`.
2.  Chạy theo thứ tự từ TC01 đến TC60.
3.  Xem log tại terminal của `booking-service` và `ai-matching-service` để thấy AI suy luận.

---
*Bản quyền thuộc về hệ thống CabGo Certification.*
