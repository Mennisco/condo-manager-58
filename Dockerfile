# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY frontend/ ./

# Build the React app
RUN yarn build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

# Install serve to run the static app
RUN npm install -g serve

# Copy built app from builder stage
COPY --from=builder /app/build ./build

# Cloud Run requires the app to listen on port defined by PORT env var, default 8080
EXPOSE 8080

# Start the app
CMD ["serve", "-s", "build", "-l", "8080"]