FROM node:20-alpine

# Install build tools for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy server deps first (layer cache)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy application files
COPY . .

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "server/server.js"]
