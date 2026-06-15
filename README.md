# 🚀 Crowd Carry - AI-Powered Peer-to-Peer Shipping Network

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-success?style=for-the-badge&logo=vercel)](https://crowd-carry-5iz3.vercel.app/)
[![Backend API](https://img.shields.io/badge/Backend-Render-blue?style=for-the-badge&logo=render)](https://crowd-carry.onrender.com)
[![Database](https://img.shields.io/badge/Database-Supabase-emerald?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Testing Suite](https://img.shields.io/badge/Tests-Jest%20Passed-brightgreen?style=for-the-badge&logo=jest)](https://github.com/arjun60840-stack/crowd-carry)

**Crowd Carry** is a next-generation peer-to-peer crowdshipping platform that disrupts traditional logistics by turning everyday travelers into couriers. Senders get faster, cheaper, and more personal deliveries, while travelers monetize their unused vehicle/luggage space, offsetting travel costs and reducing carbon footprints.

---

## 🔗 Live Production URLs

*   **Frontend Web App:** [https://crowd-carry-5iz3.vercel.app](https://crowd-carry-5iz3.vercel.app)
*   **Backend Server API:** [https://crowd-carry.onrender.com](https://crowd-carry.onrender.com)
*   **Database Host:** PostgreSQL on Supabase Cloud

---

## 🔑 Ready-to-Use Demo Accounts

The database contains pre-configured seeded accounts for testing the carrier-sender match and delivery workflows:

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
    end

    subgraph API ["Backend API Server (Express + Node.js)"]
        Routes["REST Endpoints / Routes"]
        SocketServer["Socket.io WebSocket Server"]
        Engines["Algorithms Engine (Pricing, Trust, Risk)"]
        Mailer["SMTP Nodemailer Client (Retries & Backoff)"]
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
    SocketClient <-->|WebSockets (JWT Authed)| SocketServer
    Routes --> Prisma
    Prisma <--> DB
    Engines --> Prisma
    Routes --> Engines
    Mailer -->|Real SMTP Emails| SMTP
    Routes --> Mailer
    Routes -->|Atomic Escrow Transactions| Stripe
```

---

## ✨ Features & Capabilities

### 1. AI-Powered Dynamic Pricing Engine
*   Automatically calculates fair shipping rewards using physical attributes (weight, volume, category), transit factors (distance, urgency, route complexity), and environmental parameters.
*   Enforces secure calculations on the backend to prevent sender rate spoofing.

### 2. Secure Escrow & Payments Flow
*   Powered by Stripe integration. Payments are collected atomically and locked into escrow during matching.
*   Payouts are released to carriers only when they input the correct **4-digit Delivery PIN** provided securely by the package receiver.
*   Built with database transaction blocks (`prisma.$transaction`) to guarantee atomic financial record updates.

### 3. Real-Time Tracking & Live Map
*   Leverages WebSockets (Socket.io) to publish live traveler coordinates to the map interface (Leaflet.js).
*   Senders can follow their items in real-time. Connects using JSON Web Tokens (JWT) verified during the socket handshake.

### 4. Interactive Coordination Chat
*   Integrated, encrypted real-time direct messages allowing senders and carriers to coordinate meeting locations.
*   Sessions automatically disconnect matching the user's JWT expiration.

### 5. Verified Trust & Safety Engine
*   Integrates KYC document verification state check.
*   Uses proprietary risk/trust scoring logic analyzing past user behavior, ratings, successful deliveries, and activity status to flag malicious accounts.

### 6. Environmental Impact Dashboard
*   Computes and displays CO₂ offsets saved by utilizing an existing traveler's vehicle route instead of deploying dedicated cargo couriers.

---

## 🛡️ Production & Security Hardening

To satisfy strict enterprise security audit requirements, we implemented the following hardening checklist:
*   **Startup Verification Fail-Safe**: The API performs Nodemailer validation on startup. If SMTP settings are broken or credentials are not defined in production, the server fails-fast (`process.exit(1)`) to prevent silent failures.
*   **Strict Parameter Sanitization**: Utilizes `express-validator` to reject malformed UUIDs, invalid coordinates, or invalid monetary rewards.
*   **Token Expiration & Limits**: Implements database-tracked verification tokens (`emailVerifyExpiry`) expiring in 24 hours.
*   **Brute-Force Rate Limiting**: Mounted dedicated limits:
    *   `/verify-email` (5 requests / 15 minutes)
    *   `/resend-verification-email` (3 requests / 15 minutes)
    *   `/create-checkout` (3 requests / 1 minute)
*   **Anti-Enumeration Protection**: Routes like `/forgot-password` and `/resend-verification-email` return success messages even if an email does not exist to prevent account enumeration.
*   **XSS Mitigation**: Encodes user-provided HTML template variables before transmission using dedicated sanitizers.
*   **Least-Privilege Containers**: Both frontend and backend Dockerfiles are multi-staged and run under the non-privileged `node` user.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Leaflet.js, Lucide React, Socket.io-client.
*   **Backend**: Node.js, Express, Socket.io, Prisma ORM, Nodemailer, Stripe SDK, express-validator, express-rate-limit.
*   **Database**: PostgreSQL.
*   **Testing**: Jest, ts-jest.

---

## 🚀 Local Development Setup

### Prerequisites
*   Node.js (v18 or higher)
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

# SMTP Nodemailer Settings (Optional: Leave empty for simulated logs)
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

The backend includes a comprehensive Jest unit test suite covering pricing engines, auth, package transitions, and trust calculations:
```bash
cd backend
npm test
```

---
*Developed for the AI-Powered Logistics Hackathon.*
