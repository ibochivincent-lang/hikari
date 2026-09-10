# Dockerfile for Hikari Protocol Production Services
# Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy root package definitions
COPY package*.json ./
COPY engine/package*.json ./engine/
COPY agents/package*.json ./agents/
COPY sdk/package*.json ./sdk/
COPY services/x402-gateway/package*.json ./services/x402-gateway/

# Install dependencies across all workspaces
RUN npm install
RUN npm install --prefix engine
RUN npm install --prefix agents
RUN npm install --prefix sdk
RUN npm install --prefix services/x402-gateway

# Copy full source trees
COPY engine/ ./engine/
COPY agents/ ./agents/
COPY sdk/ ./sdk/
COPY services/ ./services/
COPY frontend/ ./frontend/
COPY deployed_contracts.json ./
COPY docs/ ./docs/

# Build TypeScript packages
RUN npm run build --prefix engine
RUN npm run build --prefix agents
RUN npm run build --prefix sdk
RUN npm run build --prefix services/x402-gateway

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and runtime files from base
COPY --from=base /app /app

EXPOSE 3000 3402

# Default entrypoint starts the dashboard
CMD ["node", "frontend/server.js"]
