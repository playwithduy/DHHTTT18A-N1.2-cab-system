# Dockerfile — API Gateway (Dev)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose port (8080)
EXPOSE 8080

CMD ["npm", "run", "dev"]
