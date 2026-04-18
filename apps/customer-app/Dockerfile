FROM node:20-slim
WORKDIR /app

# Argument and environment variables
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Copy root package files
COPY package*.json ./
COPY apps/customer-app/package.json ./apps/customer-app/
COPY packages/types ./packages/types

# Install dependencies
RUN npm install

# Copy source
COPY apps/customer-app ./apps/customer-app

# Set working directory
WORKDIR /app/apps/customer-app

# Expose port
EXPOSE 3100

CMD ["npm", "run", "dev"]
