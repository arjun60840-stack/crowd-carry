# Multi-stage production Dockerfile for Crowd Carry Frontend
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

RUN chown -R node:node /app
USER node

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

# Stage 2: Production runner
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN chown -R node:node /app
USER node

# Copy standalone server and static assets from builder
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
