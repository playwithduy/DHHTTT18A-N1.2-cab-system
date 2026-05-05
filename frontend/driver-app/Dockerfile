FROM node:20-slim
WORKDIR /app

# Argument and environment variables
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL

# Copy root package files for workspace resolution
COPY package*.json ./
COPY frontend/driver-app/package.json ./frontend/driver-app/
COPY packages/types ./packages/types

# Install dependencies (using workspaces)
RUN npm install

# Copy source
COPY frontend/driver-app ./frontend/driver-app

# Set working directory to the app
WORKDIR /app/frontend/driver-app

# Expose port
EXPOSE 4200

CMD ["npm", "run", "dev"]
