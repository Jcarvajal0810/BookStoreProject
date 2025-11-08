FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
EXPOSE 50053

CMD ["sh", "-c", "node src/grpc-server.js & node src/app.js"]

