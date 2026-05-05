FROM node:20-slim
WORKDIR /app

# Argument and environment variables
ARG NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL

# Copy root package files
COPY package*.json ./
COPY frontend/admin-dashboard/package.json ./frontend/admin-dashboard/
COPY packages/types ./packages/types

# Install dependencies
RUN npm install

# Copy source
COPY frontend/admin-dashboard ./frontend/admin-dashboard

# Set working directory
WORKDIR /app/frontend/admin-dashboard

# Expose port
EXPOSE 4300

CMD ["npm", "run", "dev"]
