# Frontend Dockerfile for Nakliyat Platform
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install expo CLI globally
RUN npm install -g @expo/cli@latest

# Copy package files first for better caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1000 nakliyat && adduser -u 1000 -G nakliyat -s /bin/sh -D nakliyat
RUN chown -R nakliyat:nakliyat /app
USER nakliyat

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start command - Expo for web
CMD ["expo", "start", "--web", "--port", "3000", "--host", "0.0.0.0"]