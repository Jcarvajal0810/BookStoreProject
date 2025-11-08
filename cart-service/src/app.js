// cart-service/src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { startGrpcServer } = require('../grpc/server');
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const server = http.createServer(app); // Necesario para Socket.IO

// ================== SOCKET.IO ==================
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*", // cambiar luego al dominio del front si quieres
    methods: ["GET", "POST"]
  }
});

// Lo ponemos global para que cartController pueda emitir eventos
global.io = io;

io.on("connection", (socket) => {
  console.log(" Cliente conectado a Socket.IO");

  socket.on("disconnect", () => {
    console.log(" Cliente desconectado de Socket.IO");
  });
});

// =================================================

app.use(cors());
app.use(express.json());
app.use('/api/cart', cartRoutes);

// ====== MONGO DB ======
mongoose.connect(process.env.MONGO_URI)
  .then((connection) => {
    console.log(" Conectado a MongoDB - Cart Service");
    console.log(` Base: ${connection.connection.name}`);
    
    // ====== INICIAR gRPC CART ======
    startGrpcServer(); // Activa el Cart gRPC
  })
  .catch((error) => {
    console.error(" Error MongoDB:", error);
    process.exit(1);
  });

// ====== SERVIDOR REST + SOCKET.IO ======
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(` Cart Service REST en puerto ${PORT}`);
  console.log(` Socket.IO activo en puerto ${PORT}`);
  console.log(` Cart gRPC en puerto ${process.env.GRPC_PORT || 50053}`);
});
