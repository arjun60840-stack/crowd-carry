# 🚀 Crowd Carry - Peer-to-Peer Shipping Network

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-success?style=for-the-badge&logo=vercel)](https://crowd-carry-5iz3.vercel.app/)
[![Backend API](https://img.shields.io/badge/Backend-Render-blue?style=for-the-badge&logo=render)](https://crowd-carry.onrender.com)
[![Database](https://img.shields.io/badge/Database-Supabase-emerald?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Testing Suite](https://img.shields.io/badge/Tests-Jest%20Passed-brightgreen?style=for-the-badge&logo=jest)](https://github.com/arjun60840-stack/crowd-carry)

**Crowd Carry** is a peer-to-peer crowdshipping platform that disrupts traditional logistics by turning everyday travelers into couriers. Senders get faster, cheaper, and more personal deliveries, while travelers monetize their unused vehicle/luggage space, offsetting travel costs and reducing carbon footprints.

---

## 🔗 Live Production URLs

*   **Frontend Web App:** [https://crowd-carry-5iz3.vercel.app](https://crowd-carry-5iz3.vercel.app)
*   **Backend Server API:** [https://crowd-carry.onrender.com](https://crowd-carry.onrender.com)
*   **Database Host:** PostgreSQL on Supabase Cloud
*   **Redis Caching:** Auto In-Memory Cache Fallback enabled

---

## 🔑 Ready-to-Use Demo Accounts

The database contains pre-configured seeded accounts for testing the carrier-sender match and delivery workflows.
*(Note: These are for demo purposes on the staging database.)*

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@crowdcarry.com` | `Admin@123` |
| **Traveler (Carrier)** | `john.traveler@example.com` | `Demo@123` |
| **Sender** | `alice.sender@example.com` | `Demo@123` |

---

## 🧠 System Architecture & Workflow

The following diagram illustrates how the frontend app, backend Express API, PostgreSQL database, real-time WebSocket layer, and third-party integrations communicate:

```mermaid
graph TD
    subgraph Client ["Frontend Client (Next.js 14)"]
        UI["Glassmorphic UI / Dashboard"]
        SocketClient["Socket.io Client (Real-Time Chat & GPS)"]
        KYCPanel["KYC & Verification Hub"]
        Scanner["QR Scan Simulator & Timeline"]
    end

    subgraph API ["Backend API Server (Express + Node.js)"]
        Routes["REST Endpoints / Routes"]
        SocketServer["Socket.io WebSocket Server"]
        Engines["Algorithms Engine (Pricing, Trust, Risk)"]
        Mailer["SMTP Nodemailer Client (Retries & Backoff)"]
        Cache["Redis Cache Manager (Local Memory Fallback)"]
    end

    subgraph Storage ["Database Cluster"]
        DB[(PostgreSQL - Supabase)]
        Prisma["Prisma ORM Client"]
    end

    subgraph External ["External Services"]
        Stripe["Stripe Checkout & Escrow"]
        SMTP["SMTP Mail Server"]
    end

    UI -->|HTTPS Requests| Routes
    SocketClient <-->|"WebSockets (JWT Authed)"| SocketServer
    Routes --> Prisma
    Prisma <--> DB
    Engines --> Prisma
    Routes --> Engines
    Routes --> Cache
    Mailer -->|Real SMTP Emails| SMTP
    Routes --> Mailer
    Routes -->|Atomic Escrow Transactions| Stripe
```

---

## ✨ Features & Capabilities

### 1. Dynamic Pricing Engine
*   Automatically calculates fair shipping rewards using physical attributes (weight, volume, category), transit factors (distance, urgency, route complexity), and environmental parameters through a deterministic rules engine.
*   Enforces secure calculations on the backend to prevent sender rate spoofing.

### 2. Secure Escrow & Payments Flow
*   Powered by Stripe integration. Payments are collected atomically and locked into escrow during matching.
*   Payouts are released to carriers only when they input the correct **4-digit Delivery PIN** provided securely by the package receiver, or complete a validated QR code scan.
*   Built with database transaction blocks (`prisma.$transaction`) to guarantee atomic financial record updates.

### 3. Real-Time Tracking & Live Map
*   Leverages WebSockets (Socket.io) to publish live traveler coordinates to the map interface (Leaflet.js).
*   Senders can follow their items in real-time. Connects using JSON Web Tokens (JWT) verified during the socket handshake.

### 4. Interactive Coordination Chat
*   Integrated real-time direct messages allowing senders and carriers to coordinate meeting locations over secure TLS connections (HTTPS/WSS).
*   Sessions automatically disconnect matching the user's JWT expiration.

### 5. Verified Trust & Safety System
*   **Multi-Level KYC Hub**: Tracks user verification level from 0 (Email) to 4 (Trusted Carrier status approved by Admin) with government ID uploads and selfies.
*   **Auto-Approve (Demo Mode)**: To facilitate rapid testing during evaluation, users with a `PENDING` status can bypass Admin review by clicking the **Auto-Approve Documents** button inside the KYC page to instantly verify their credentials. *(Hidden in production environments).*
*   **Dynamic Trust Scoring Engine**: Automatically computes reputations (0-100) using positive multipliers (deliveries, ratings, KYC tiers, account age) and negative penalties (active disputes, carrier fault incidents, policy violations).
*   **QR Scanner Timeline**: Displays package transit milestones (Created -> Matched -> Picked Up -> In Transit -> Delivered) along with a simulated QR scanning drawer that pre-populates scan coordinates.
*   **Disputes & Claims**: Built-in modals allowing users to file package disputes (holding escrow payouts) or submit insurance claims with evidence image uploads.

### 6. Environmental Impact Dashboard
*   Computes and displays CO₂ offsets saved by utilizing an existing traveler's vehicle route instead of deploying dedicated cargo couriers.

---

## ⚡ Redis Caching Layer

*   Implemented Redis caching on high-frequency routes like `/profile` and `/packages/:id` to speed up page loads.
*   **Fail-Safe Architecture**: If Redis is not configured or offline, the app transparently and cleanly falls back to using an in-memory local `Map` cache. It skips connection attempts to prevent console warning logs (`ECONNREFUSED`) or startup delays.

---

## 🛡️ Production & Security Hardening

To ensure a secure foundation, we implemented the following hardening checklist:
*   **SMTP Startup Verification Bypass**: nodemailers' startup connection check can be bypassed in demo builds using `BYPASS_SMTP_VERIFY=true` to prevent container crashes on Render.
*   **Strict Parameter Sanitization**: Utilizes `express-validator` to reject malformed UUIDs, invalid coordinates, or invalid monetary rewards.
*   **Token Expiration & Limits**: Implements database-tracked verification tokens (`emailVerifyExpiry`) expiring in 24 hours.
*   **Brute-Force Rate Limiting**: Dedicated rate limiters are mounted on authentication endpoints, verification retries, and Stripe checkouts.
*   **Anti-Enumeration Protection**: Routes like `/forgot-password` and `/resend-verification-email` return success messages even if an email does not exist to prevent account enumeration.
*   **XSS Mitigation**: Encodes user-provided HTML template variables before transmission using dedicated sanitizers.
*   **Least-Privilege Containers**: Both frontend and backend Dockerfiles are multi-staged and run under the non-privileged `node` user.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Leaflet.js, Lucide React, Socket.io-client.
*   **Backend**: Node.js, Express, Socket.io, Prisma ORM, Nodemailer, Stripe SDK, express-validator, express-rate-limit, ioredis.
*   **Database**: PostgreSQL.
*   **Testing**: Jest, ts-jest.

---

## 🚀 Local Development Setup

### Prerequisites
*   Node.js (v20 or higher)
*   PostgreSQL Database instance

### 1. Repository Installation
```bash
git clone https://github.com/arjun60840-stack/crowd-carry.git
cd crowd-carry
```

### 2. Backend Environment Configuration
Navigate to the `backend/` directory:
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` with the following variables:
```env
# Database Settings
DATABASE_URL="postgresql://postgres:password@localhost:5432/crowdcarry?schema=public"

# Server Settings
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d

# CORS Allowed Origin
FRONTEND_URL="http://localhost:3000"

# Redis Cache Settings (Optional: Leave empty for simulated memory fallback)
# REDIS_URL="redis://127.0.0.1:6379"

# SMTP Nodemailer Settings (Optional: Set BYPASS_SMTP_VERIFY=true to skip connection check)
BYPASS_SMTP_VERIFY=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM='"Crowd Carry" <noreply@crowdcarry.com>'

# Stripe (Optional for simulated dev testing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Push the schema to your local database:
```bash
npx prisma db push
npm run dev
```

### 3. Frontend Environment Configuration
In another terminal, navigate to the `frontend/` directory:
```bash
cd ../frontend
npm install
```

Create a `.env.local` file inside `frontend/` with the following variables:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_APP_NAME="Crowd Carry"
```

Start the React development server:
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the application.

---

## 🐋 Running via Docker Compose

To orchestrate the backend, frontend, and database locally with a single command:
```bash
docker-compose up --build
```
This mounts:
*   PostgreSQL at `localhost:5432`
*   Express API Server at `localhost:5000`
*   Next.js Client at `localhost:3000`

---

## 🧪 Running Automated Tests

The backend includes a Jest unit test suite covering the pricing engine, auth, package transitions, and trust calculations:
```bash
cd backend
npm test
```

---
*Developed for the Logistics Hackathon.*
