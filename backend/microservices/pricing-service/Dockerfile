FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g typescript ts-node
EXPOSE 3006
CMD ["npm", "run", "dev"]
