const express = require('express');
const axios = require('axios');
const router = express.Router();

//  IMPORTANTE: dentro de Docker, "localhost" no apunta al host,
// sino al propio contenedor del Gateway.
// Por eso usamos el nombre del contenedor del servicio de inventario.
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory:8000';


//  Middleware que redirige todas las peticiones hacia el microservicio de inventario
router.all('*', async (req, res) => {
  try {
    // Construir la URL completa hacia el microservicio
    const targetUrl = `${INVENTORY_URL}/api/inventory${req.path}`;
    console.log(` Enrutando petición a: ${targetUrl} [${req.method}]`);

    // Enviar la solicitud al microservicio
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined, // Evita conflictos con cabeceras Host
      },
      validateStatus: () => true // Permite manejar errores manualmente
    });

    // Si el microservicio responde con error (4xx/5xx)
    if (response.status >= 400) {
      console.error(` Error del microservicio (${response.status}):`, response.data);
      return res.status(response.status).json(response.data);
    }

    //  Respuesta exitosa
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error(' Error al conectar con el servicio de inventario:');
    console.error(error.message);

    // Si Axios recibió respuesta con error del microservicio
    if (error.response) {
      console.error(' Respuesta del microservicio:', error.response.data);
      return res
        .status(error.response.status || 500)
        .json(error.response.data || { error: 'Error en inventory service' });
    }

    // Si Axios no pudo conectarse al servicio
    res.status(500).json({ error: 'No se pudo conectar con el servicio de inventario' });
  }
});

module.exports = router;
