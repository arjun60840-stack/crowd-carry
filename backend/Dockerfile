# Production Dockerfile for Crowd Carry Backend
FROM node:18-alpine

WORKDIR /app

# Change ownership of /app to node user
RUN chown -R node:node /app

USER node

# Install dependencies first (leverages Docker layer caching)
COPY --chown=node:node package*.json ./
RUN npm ci

# Generate Prisma client
COPY --chown=node:node prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY --chown=node:node . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
