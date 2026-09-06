# ==============================================================================
# AutoGuard AI — Production Container Image (Multi-Stage Build)
# ==============================================================================

# --- Stage 1: Build Frontend Bundle ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package*.json ./
RUN npm ci

# Copy full source tree and configuration files
COPY . .

# Compile TypeScript and build production Vite distribution bundle
RUN npx tsc --noEmit && npx vite build

# --- Stage 2: High-Performance Production Web Server ---
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration tailored for SPA & PWA service workers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP & HTTPS ports
EXPOSE 80 443

# Built-in container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
