const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const cartRoutes = require('./routes/cartRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/cart', cartRoutes);

// Conexión con MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then((connection) => {
    console.log(" Conectado a MongoDB - Cart Service");
    console.log(` Base de datos actual: ${connection.connection.name}`);
    console.log(` Host: ${connection.connection.host || 'MongoDB Atlas Cluster'}`);
  })
  .catch((error) => {
    console.error(" Error al conectar a MongoDB:", error);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🛒 Cart Service ejecutándose en el puerto ${PORT}`));
