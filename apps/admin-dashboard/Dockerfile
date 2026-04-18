FROM node:20-slim
WORKDIR /app

# Argument and environment variables
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL

# Copy root package files
COPY package*.json ./
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY packages/types ./packages/types

# Install dependencies
RUN npm install

# Copy source
COPY apps/admin-dashboard ./apps/admin-dashboard

# Set working directory
WORKDIR /app/apps/admin-dashboard

# Expose port
EXPOSE 3300

CMD ["npm", "run", "dev"]
