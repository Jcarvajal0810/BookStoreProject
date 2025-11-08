FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
EXPOSE 50056
CMD ["sh", "-c", "node orderServer.js & node index.js"]
