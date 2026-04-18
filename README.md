# 🚗 CabGo — Cab Booking System
## Kiến trúc Microservices với AI Matching

> **Stack:** Next.js 14 · TypeScript · TailwindCSS · Socket.IO · Kafka · PostgreSQL · MongoDB · Redis · Kubernetes

---

## 📁 Cấu Trúc Dự Án

```
cab-booking/
├── apps/
│   ├── customer-app/          # Port 3100 — Ứng dụng khách hàng
│   ├── driver-app/            # Port 3200 — Ứng dụng tài xế
│   └── admin-dashboard/       # Port 3300 — Quản trị viên
├── packages/
│   └── types/                 # Shared TypeScript types + mock data
├── services/                  # Backend microservices (build riêng)
│   ├── api-gateway/           # Port 8080
│   ├── auth-service/          # Port 3001
│   ├── booking-service/       # Port 3002
│   ├── ride-service/          # Port 3003
│   ├── driver-service/        # Port 3004
│   ├── payment-service/       # Port 3005
│   ├── pricing-service/       # Port 3006
│   └── notification-service/  # Port 3007
├── infrastructure/
│   ├── k8s/                   # Kubernetes manifests
│   └── terraform/             # IaC
├── docker-compose.yml         # Local dev environment
└── package.json               # Monorepo root
```

---

## 🗺️ Lộ Trình Phát Triển

### PHASE 1 — Setup Monorepo (Tuần 1)

**Mục tiêu:** Tạo nền tảng dự án

```bash
# 1. Tạo cấu trúc thư mục
mkdir cab-booking && cd cab-booking

# 2. Init monorepo
yarn init -y
yarn add -D concurrently typescript

# 3. Tạo 3 Next.js apps
npx create-next-app@latest apps/customer-app --typescript --tailwind --app
npx create-next-app@latest apps/driver-app --typescript --tailwind --app
npx create-next-app@latest apps/admin-dashboard --typescript --tailwind --app

# 4. Copy các file cấu hình đã cung cấp vào đúng thư mục

# 5. Chạy thử
yarn dev:customer  # localhost:3100
yarn dev:driver    # localhost:3200
yarn dev:admin     # localhost:3300
```

**Files cần tạo từ scaffold này:**
- `package.json` (root) ✅
- `packages/types/index.ts` ✅
- `packages/types/mock-data.ts` ✅
- `apps/*/package.json` ✅
- `apps/*/tailwind.config.js` ✅
- `apps/*/src/app/layout.tsx` ✅
- `apps/*/src/app/page.tsx` ✅

---

### ✅ PHASE 2 — Design System (Tuần 1-2)

**Mục tiêu:** Component library chung

```
apps/customer-app/src/components/ui/
├── Button.tsx        # ✅ Done
├── Input.tsx         # ✅ Done
├── Card.tsx          # ✅ Done
├── Modal.tsx         # ✅ Done
├── Toast.tsx         # ✅ Done
├── Spinner.tsx       # ✅ Done
├── Badge.tsx         # ✅ Done
└── BottomSheet.tsx   # ✅ Done
```

**Prompt mở rộng:**
```
Create reusable UI components for a mobile-first cab booking app.
Use TailwindCSS. Each component must:
- Accept className prop for customization
- Have proper TypeScript types
- Follow accessibility guidelines
- Match Grab/Uber style: clean, rounded, green accent
```

---

### 🟡 PHASE 3 — Customer App UI (Tuần 2-3)

**Màn hình cần hoàn thiện:**

| Màn hình | Route | Status |
|----------|-------|--------|
| Home Map | `/` | ✅ Done (Leaflet integration) |
| Chọn điểm đi/đến | `/` (bottom sheet) | ✅ Done |
| Chọn loại xe | `/` (bottom sheet) | ✅ Done |
| Đang tìm tài xế | `/` (bottom sheet) | ✅ Done |
| Tài xế được phân công | `/` (bottom sheet) | ✅ Done |
| Đang trên đường | `/` (bottom sheet) | ✅ Done |
| Hoàn thành & đánh giá | `/` (bottom sheet) | ✅ Done |
| Lịch sử chuyến đi | `/rides` | ✅ Done |
| Thông báo | `/notifications` | ⬜ Cần tạo |
| Hồ sơ | `/profile` | ⬜ Cần tạo |

**Thêm Mapbox thật:**
```bash
# 1. Tạo tài khoản mapbox.com (free tier)
# 2. Copy token vào .env.local:
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# 3. Cài package
yarn workspace @cab/customer-app add mapbox-gl @types/mapbox-gl

# 4. Replace MapPlaceholder với MapboxMap component
```

---

### ⬜ PHASE 4 — Driver App UI (Tuần 3)

**Màn hình cần hoàn thiện:**

| Màn hình | Status |
|----------|--------|
| Login / KYC | ⬜ Tạo mới |
| Online/Offline toggle | ✅ Done |
| Incoming Request popup | ✅ Done |
| Navigation to pickup | ✅ Done (basic) |
| In-trip screen | ✅ Done |
| Earnings dashboard | ⬜ Tạo mới |
| Trip history | ⬜ Tạo mới |

```bash
# Chạy driver app riêng:
yarn dev:driver
# Truy cập: localhost:3200
```

---

### ⬜ PHASE 5 — Admin Dashboard (Tuần 3-4)

**Module cần hoàn thiện:**

| Module | Status |
|--------|--------|
| Dashboard KPIs | ✅ Done |
| Revenue chart | ✅ Done (basic) |
| Rides table | ✅ Done |
| Users management | ⬜ CRUD table |
| Drivers management | ⬜ Map + list |
| Pricing control | ⬜ Form + surge |
| Security / Audit | ⬜ Log viewer |

**Thêm Recharts:**
```bash
yarn workspace @cab/admin-dashboard add recharts
```

---

### ⬜ PHASE 6 — Backend Services (Tuần 4-6)

**Thứ tự build services:**

```
1. auth-service       — JWT, refresh token, bcrypt
2. api-gateway        — Rate limiting, JWT validation, routing
3. user-service       — CRUD profile
4. driver-service     — Location, status, Redis Geo
5. booking-service    — Tạo booking, saga pattern
6. pricing-service    — Surge pricing, base fare
7. ride-service       — Ride lifecycle, WebSocket events
8. payment-service    — Stripe, retry logic
9. notification-svc   — Kafka consumer, FCM push
```

**Mỗi service dùng template:**
```
service/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── middleware/
│   └── events/        # Kafka producers/consumers
├── prisma/schema.prisma
├── Dockerfile
└── package.json
```

**Khởi động infra local:**
```bash
docker-compose up postgres mongodb redis kafka -d
```

---

### ⬜ PHASE 7 — Real-time Integration (Tuần 6-7)

**WebSocket events flow:**
```
Driver App  →  GPS (lat,lng)  →  WebSocket Gateway
                                 → Redis Geo update
                                 → Kafka: DriverLocationUpdated
                                 → Customer App receives update
```

**Checklist:**
- [ ] Socket.IO server trong api-gateway
- [ ] Room management (rideId-based rooms)
- [ ] GPS stream từ driver app
- [ ] Location updates tới customer app
- [ ] Ride status changes realtime

---

### ⬜ PHASE 8 — AI Matching (Tuần 7-8)

**Algorithm:**
```typescript
// AI Matching Score Formula:
score = (
  0.4 * (1 / distance_km)   +   // Proximity
  0.3 * driver.rating / 5   +   // Rating
  0.2 * (1 / eta_minutes)   +   // Speed
  0.1 * acceptance_rate         // Reliability
)
```

**Components:**
- [ ] Feature Store (Redis)
- [ ] Matching Service (Node.js + ML logic)
- [ ] Driver ranking API
- [ ] A/B testing support

---

### ⬜ PHASE 9 — Security (Tuần 8)

**Zero Trust checklist:**
- [ ] JWT RS256 (asymmetric keys)
- [ ] Refresh token rotation
- [ ] Rate limiting per user/IP
- [ ] RBAC middleware
- [ ] mTLS giữa services
- [ ] API Gateway WAF rules
- [ ] Audit logging

---

### ⬜ PHASE 10 — Deployment (Tuần 9-10)

**Kubernetes setup:**
```bash
# Build & push images
docker build -t cabgo/customer-app ./apps/customer-app
docker push cabgo/customer-app

# Apply k8s manifests
kubectl apply -f infrastructure/k8s/

# Check pods
kubectl get pods -n cabgo
```

**Terraform (AWS):**
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

---

## 🚀 Quick Start (Development)

```bash
# 1. Clone & install
git clone <repo>
cd cab-booking
yarn install

# 2. Start infrastructure
docker-compose up postgres mongodb redis -d

# 3. Copy env files
cp apps/customer-app/.env.example apps/customer-app/.env.local
# Edit with your MAPBOX_TOKEN, API URLs

# 4. Start all frontend apps
yarn dev:all

# URLs:
# Customer: http://localhost:3100
# Driver:   http://localhost:3200
# Admin:    http://localhost:3300
```

---

## 🔑 Environment Variables

```env
# .env.local (mỗi app)
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # Từ mapbox.com

# docker-compose cần .env
JWT_SECRET=your-super-secret-key-min-32-chars
STRIPE_SECRET_KEY=sk_test_...
FCM_SERVER_KEY=...
MAPBOX_TOKEN=pk.eyJ1...
```

---

## 📊 Kiến Trúc Tổng Thể

```
Client Layer (3 Next.js Apps)
        ↓ HTTPS / WebSocket
   API Gateway (Node.js :8080)
        ↓ Routes to
┌─────────────────────────────────────────────┐
│              Microservices Layer              │
│  Auth  Booking  Ride  Driver  Payment  Price │
└─────────────────────────────────────────────┘
        ↓ Events (Kafka)
   Notification Service
        ↓
   Data Layer
   PostgreSQL + MongoDB + Redis
```

---

## 📞 Hỗ Trợ

Mỗi phase có **prompt sẵn** — paste vào Claude để generate code tiếp theo.
Xem file `docs/prompts.md` để lấy prompt từng phase.
