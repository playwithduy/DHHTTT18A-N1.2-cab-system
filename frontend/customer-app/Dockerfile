FROM node:20-slim
WORKDIR /app

# Argument and environment variables
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Copy root package files
COPY package*.json ./
COPY frontend/customer-app/package.json ./frontend/customer-app/
COPY packages/types ./packages/types

# Install dependencies
RUN npm install

# Copy source
COPY frontend/customer-app ./frontend/customer-app

# Set working directory
WORKDIR /app/frontend/customer-app

# Expose port
EXPOSE 4100

CMD ["npm", "run", "dev"]
