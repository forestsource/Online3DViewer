# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the project
RUN npm run build_dev

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/website ./website
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./server.js

# Expose port
EXPOSE 8080

# Start custom static server with redirect logic
CMD ["node", "server.js"]
