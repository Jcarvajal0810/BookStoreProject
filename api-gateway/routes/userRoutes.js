const express = require('express');
const axios = require('axios');
const router = express.Router();

const USER_URL = process.env.USER_SERVICE_URL || 'http://user-service:6000';

router.all('*', async (req, res) => {
  let targetUrl;

  try {
    // Construir la ruta correcta
    let path = req.path;
    
    // Si la ruta empieza con /auth, agregarle /api
    if (path.startsWith('/auth')) {
      targetUrl = `${USER_URL}/api${path}`;
    } 
    // Si ya tiene /api, usarla tal cual
    else if (path.startsWith('/api')) {
      targetUrl = `${USER_URL}${path}`;
    } 
    // Si es cualquier otra, agregarle /api/users
    else {
      targetUrl = `${USER_URL}/api/users${path}`;
    }

    console.log(` [UserRoute] ${req.method} -> ${targetUrl}`);

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined,
      },
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      console.error(` Error del microservicio User (${response.status}):`, response.data);
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