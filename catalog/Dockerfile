# Dockerfile para microservicio Catalog
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
Expose 50054

CMD ["node", "index.js"]
