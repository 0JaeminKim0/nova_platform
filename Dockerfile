# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim

WORKDIR /app

# Install runtime deps for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built output + schema + seed data
COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY seed.sql ./seed.sql

# Create persistent data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/nova.db

EXPOSE 3000

CMD ["node", "dist/server.mjs"]
