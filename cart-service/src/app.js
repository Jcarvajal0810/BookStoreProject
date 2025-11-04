const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const cartRoutes = require('./routes/cartRoutes');
const { startGrpcServer } = require('../grpc/server'); // ← NUEVO

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/cart', cartRoutes);

// ====== CONEXIÓN A MONGODB ======
mongoose.connect(process.env.MONGO_URI)
  .then((connection) => {
    console.log(" Conectado a MongoDB - Cart Service");
    console.log(` Base de datos: ${connection.connection.name}`);
    console.log(` Host: ${connection.connection.host || 'MongoDB Atlas'}`);
    
    // ====== INICIAR SERVIDOR gRPC ======
    startGrpcServer(); // ← NUEVO
  })
  .catch((error) => {
    console.error(" Error al conectar a MongoDB:", error);
    process.exit(1);
  });

// ====== SERVIDOR REST ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Cart Service REST en puerto ${PORT}`);
  console.log(` Cart Service gRPC en puerto ${process.env.GRPC_PORT || 50053}`);
});