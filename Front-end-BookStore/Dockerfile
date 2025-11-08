# Usa Node 22, compatible con React 19 y Vite 7
FROM node:22-alpine

# Define el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Configura el registro de npm (soluciona errores de red ENOTFOUND)
RUN npm config set registry https://registry.npmjs.org/

# Instala dependencias
RUN npm install

# Copia el resto del código del frontend
COPY . .

# Expone el puerto 3500 (el mismo que usa Vite en tu script)
EXPOSE 3500

# Ejecuta el servidor de desarrollo accesible desde fuera del contenedor
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3500"]
