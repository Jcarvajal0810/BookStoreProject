const express = require('express');
const axios = require('axios');
const router = express.Router();

// Dentro de Docker, usa el nombre del contenedor (no localhost)
const USER_URL = process.env.USER_SERVICE_URL || 'http://user-service:6000';

router.all('*', async (req, res) => {
  let targetUrl; // Variable visible también en el catch

  try {
    // Limpia posibles duplicaciones de /api
    const cleanPath = req.path.replace(/^\/api/, '');
    targetUrl = `${USER_URL}/api${cleanPath}`;

    console.log(`🔁 [UserRoute] ${req.method} -> ${targetUrl}`);

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined, // evita conflictos con cabecera Host
      },
      validateStatus: () => true, // permite manejar todos los códigos manualmente
    });

    if (response.status >= 400) {
      console.error(`⚠️ Error del microservicio User (${response.status}):`, response.data);
      return res.status(response.status).json(response.data);
    }

    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('💥 Error al conectar con el servicio de usuarios:', error.message);
    if (error.response) {
      console.error('Respuesta del microservicio:', error.response.data);
      return res
        .status(error.response.status || 500)
        .json(error.response.data || { error: 'Error en user service' });
    }

    res.status(500).json({ error: 'No se pudo conectar con el servicio de usuarios' });
  }
});

module.exports = router;
