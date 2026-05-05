# Dockerfile — AI Matching Service (Dev)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 3008

CMD ["npm", "run", "dev"]
