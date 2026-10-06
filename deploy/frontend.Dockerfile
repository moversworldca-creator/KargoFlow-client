# Production Dockerfile for Movers CRM Frontend
# Multi-stage build for optimization

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY platform-admin/package*.json ./platform-admin/

RUN npm install

# Copy source code
COPY frontend/ ./frontend/
COPY platform-admin/ ./platform-admin/

# Build arguments
ARG VITE_API_URL=/api
ARG VITE_GOOGLE_MAPS_API_KEY=

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Build both applications
RUN npm run build --workspace=frontend
RUN npm run build --workspace=platform-admin

# Production stage with Caddy (HTTP serving only; TLS is terminated by stack Caddy)
FROM caddy:2-alpine

# Install utility for health check
RUN apk add --no-cache curl

# Copy Caddy runtime config and compiled static assets
COPY deploy/caddy-frontend.Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/frontend/dist /usr/share/caddy
COPY --from=builder /app/platform-admin-dist /usr/share/caddy/platform-admin

# Create directories for static and media mount points
RUN mkdir -p /staticfiles /media

# Health check for Caddy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -fsS http://localhost/health > /dev/null

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
