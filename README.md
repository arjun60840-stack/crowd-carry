<div align="center">
  <img src="./frontend/public/favicon.ico" alt="Logo" width="80" height="80">

  <h3 align="center">Crowd Carry</h3>

  <p align="center">
    <strong>AI-Powered Peer-to-Peer Shipping Network</strong><br>
    <em>A hackathon project disrupting the logistics industry by turning everyday travelers into carriers.</em>
  </p>
</div>

<br />

## 🌍 The Problem
Traditional courier and logistics services are often slow, expensive, and environmentally taxing. Meanwhile, thousands of people travel across cities and countries every day with extra space in their vehicles or luggage. There is a massive missed opportunity to utilize this unused capacity.

## 💡 Our Solution
**Crowd Carry** connects people who need to send packages with travelers who are already heading that way. 
- **Senders** get cheaper, faster, and more personalized delivery.
- **Carriers** monetize their empty space and offset their travel costs.
- **The Planet** benefits from a massive reduction in CO₂ emissions since no new vehicles are dispatched.

## ✨ Key Features

- 🧠 **AI-Powered Dynamic Pricing:** Automatically calculates fair rewards based on package weight, distance, urgency, and category.
- 📍 **Real-Time GPS Tracking:** Live WebSocket-based map tracking (Leaflet + Socket.io) allows Senders to watch their package move in real-time.
- 🔒 **Secure Escrow Payments:** Funds are securely held in escrow. The Carrier only gets paid once the Receiver provides the 4-digit Delivery PIN.
- 💬 **Live Chat & Negotiation:** Built-in real-time messaging system to coordinate pickups and drop-offs.
- 🛡️ **Trust & Safety System:** Comprehensive KYC (Know Your Customer) verification, user ratings, and trusted traveler badges.
- 🌱 **Environmental Impact Tracking:** Calculates and displays the estimated CO₂ emissions saved by utilizing an existing traveler's route.

## 🛠️ Technology Stack

**Frontend:**
- [Next.js 14](https://nextjs.org/) (React Framework)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Leaflet.js](https://leafletjs.com/) (Interactive Maps & Routing)
- [Socket.io-client](https://socket.io/) (Real-time updates)
- [Lucide Icons](https://lucide.dev/)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) (REST API)
- [Socket.io](https://socket.io/) (WebSocket Server for Chat & GPS)
- [Prisma](https://www.prisma.io/) (Modern ORM)
- [PostgreSQL](https://www.postgresql.org/) (Relational Database)
- [JWT](https://jwt.io/) (Authentication & Security)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL

### 1. Clone the repository
```bash
git clone https://github.com/arjun60840-stack/crowd-carry.git
cd crowd-carry
```

### 2. Setup Backend
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/crowdcarry"
JWT_SECRET="your_jwt_secret"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```
Run migrations and start the server:
```bash
npx prisma db push
npm run dev
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
```
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_APP_NAME="Crowd Carry"
```
Start the frontend application:
```bash
npm run dev
```

The application will be running at `http://localhost:3000`.

## 🎨 Design Philosophy
We utilized a modern, premium "glassmorphism" aesthetic with a dark mode color palette to build an interface that feels highly trustworthy, engaging, and professional.

## 🔮 Future Roadmap
- Integration with AI for optimal route bundling (allowing carriers to pick up multiple packages along a route).
- Insurance integration for high-value items.
- Mobile Application using React Native.

---
*Built with ❤️ for the Hackathon.*
