# Dockerfile — Ride Service (Dev)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose port (WebSocket)
EXPOSE 3003

CMD ["npm", "run", "dev"]
