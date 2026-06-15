# Production Dockerfile for Crowd Carry Backend
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (leverages Docker layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
