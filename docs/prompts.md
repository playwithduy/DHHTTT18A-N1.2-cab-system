# 📋 Prompts Từng Phase — CabGo Cab Booking System

---

## PHASE 1 — Component Library

```
Create a complete UI component library for a mobile-first cab booking app (like Grab/Uber).

Tech: React + TypeScript + TailwindCSS

Components needed:
1. Button — variants: primary (green), secondary, danger, ghost, outline
2. Input — with label, error state, left/right icon slots
3. Card — with shadow, hover effect
4. BottomSheet — slide-up from bottom, with handle bar, configurable height
5. Modal — accessible overlay dialog
6. Badge — status colors: green (active), blue (info), red (error), yellow (warning)
7. Spinner — animated loading indicator
8. Avatar — circular with fallback initials

Each component:
- TypeScript props interface
- className prop for customization
- Clean TailwindCSS styling (green #22c55e primary color)
- No external UI libraries except lucide-react for icons
```

---

## PHASE 2 — Customer App — Ride History Page

```
Build a Ride History page for a customer in a cab booking app.

Route: /rides
Stack: Next.js App Router + TypeScript + TailwindCSS

Features:
- List of past rides (use MOCK_RIDES data)
- Each card shows: pickup → dropoff, fare, date, driver name, rating
- Filter by: All / Completed / Cancelled
- Click to expand ride detail
- "Book again" button on each ride

Use these types (from @cab/types):
- Ride, RideStatus, Driver, Fare

Mobile-first design, clean card layout, brand color: #22c55e
```

---

## PHASE 3 — Driver App — Earnings Dashboard

```
Build an Earnings Dashboard page for a taxi driver app.

Route: /earnings
Stack: Next.js + TypeScript + TailwindCSS

Sections:
1. Today's summary: Total earned, trips count, online hours
2. Weekly chart: Bar chart showing daily earnings (use inline SVG or simple CSS bars)
3. Trip list: Last 10 trips with time, distance, earning per trip
4. Payment status: Pending payout amount, "Request Payout" button

Color scheme: Dark theme (#0f172a background, #22c55e accent)
Mobile-first. Use mock data for all values.
```

---

## PHASE 4 — Admin — Users Management Table

```
Build a Users Management page for an admin dashboard.

Stack: Next.js + TypeScript + TailwindCSS
Route: /admin/users

Features:
- Sortable data table with: Name, Email, Phone, Role, Status, Join Date, Actions
- Search bar (filter by name/email)
- Filter by Role: All / Customer / Driver / Admin
- Pagination (10 per page)
- Row actions: View, Edit, Suspend, Delete
- Status badge: Active (green), Suspended (red), Pending (yellow)
- Bulk select + bulk actions

Use mock data array of 20 users.
Clean table design matching Tailwind Admin style.
```

---

## PHASE 5 — Auth Service (Backend)

```
Build a Node.js Auth Service microservice.

Tech: Node.js + Express + TypeScript + Prisma + PostgreSQL + Redis + JWT

Endpoints:
POST /auth/register    — Register new user
POST /auth/login       — Login, return JWT + refresh token
POST /auth/refresh     — Refresh access token (rotate refresh token)
POST /auth/logout      — Blacklist refresh token
GET  /auth/me          — Get current user (protected)

Security:
- bcrypt password hashing (rounds: 12)
- JWT RS256 (asymmetric), access token 15min, refresh token 7 days
- Store refresh tokens in Redis with TTL
- Token rotation on refresh
- Rate limiting: 5 login attempts per IP per minute

Prisma schema for User table.
Full error handling, proper HTTP status codes.
```

---

## PHASE 6 — Booking Service với Saga Pattern

```
Build a Booking Service microservice with Saga orchestration.

Tech: Node.js + Express + TypeScript + Prisma + Kafka

Flow (Booking Saga):
1. Create booking → Publish "RideCreated" to Kafka
2. Driver Service consumes → finds best driver → Publish "DriverAssigned"
3. Booking Service updates status → Publish "BookingConfirmed"
4. On failure → Publish "BookingFailed" → compensate

Kafka topics:
- ride.created
- driver.assigned
- booking.confirmed
- booking.failed

Endpoints:
POST /bookings          — Create booking
GET  /bookings/:id      — Get booking
PATCH /bookings/:id/cancel — Cancel booking

Prisma schema for Booking table.
Include full Kafka producer/consumer setup with error handling.
```

---

## PHASE 7 — Real-time WebSocket Gateway

```
Build a WebSocket Gateway using Socket.IO.

Tech: Node.js + Socket.IO + TypeScript + Redis (adapter)

Features:
1. JWT authentication on connection
2. Room management:
   - Customer joins room: "ride:{rideId}"
   - Driver joins room: "driver:{driverId}"
3. Events to broadcast:
   - ride:status_changed → to ride room
   - driver:location_updated → to ride room
   - ride:driver_assigned → to customer
   - payment:success → to customer

GPS handling:
- Driver emits "gps:update" with {lat, lng} every 3 seconds
- Gateway stores in Redis Geo
- Broadcasts to customer's ride room

Redis adapter for horizontal scaling across multiple gateway instances.
Include connection/reconnection handling.
```

---

## PHASE 8 — AI Driver Matching Service

```
Build an AI Driver Matching microservice.

Tech: Node.js + TypeScript + Redis Geo

Algorithm:
1. Get candidate drivers from Redis Geo (within radius km)
2. Fetch features from Feature Store:
   - driver.rating (0-5)
   - driver.acceptance_rate (0-1)
   - driver.eta (minutes)
   - driver.distance (km)
3. Score each driver:
   score = (0.4 * proximity) + (0.3 * rating) + (0.2 * speed) + (0.1 * reliability)
4. Return top 3 drivers, assign best one

Endpoint:
POST /match
Body: { pickup: {lat,lng}, vehicleType, rideId }
Response: { driver: Driver, eta: number, score: number }

Include unit tests for scoring algorithm.
```

---

## PHASE 9 — Payment Service với Retry Logic

```
Build a Payment Service with retry logic (matches sequence diagram 9.5).

Tech: Node.js + TypeScript + Stripe + Kafka + Prisma

Flow:
1. Consume "ride.completed" from Kafka
2. Create payment intent via Stripe
3. On success → Publish "payment.completed" 
4. On failure → Retry with exponential backoff (max 3 times)
5. On retry exhausted → Publish "payment.retry_exhausted" → mark ride UNPAID

Endpoints:
POST /payments/intent       — Create payment intent
POST /payments/:id/confirm  — Confirm payment
GET  /payments/:id          — Get payment status
POST /payments/:id/refund   — Issue refund

Kafka consumers/producers for event-driven flow.
Full retry implementation with Kafka.
```

---

## PHASE 10 — Kubernetes Deployment

```
Create Kubernetes deployment manifests for the CabGo microservices.

Services to deploy:
- api-gateway (2 replicas)
- auth-service (2 replicas)
- booking-service (2 replicas)
- ride-service (2 replicas)
- driver-service (2 replicas)
- payment-service (1 replica)
- notification-service (1 replica)
- customer-app (2 replicas)
- driver-app (2 replicas)
- admin-dashboard (1 replica)

For each service create:
1. Deployment.yaml — with resource limits, liveness/readiness probes
2. Service.yaml — ClusterIP for internal, LoadBalancer for gateway
3. HPA.yaml — autoscale on CPU 70%

Also create:
- Namespace: cabgo
- ConfigMap for shared config
- Secret template (no real values)
- Ingress with TLS for all apps

Target: AWS EKS with spot instances for cost savings.
```
