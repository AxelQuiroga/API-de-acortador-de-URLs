// En producción, Express sirve el frontend y la API desde el mismo origen,
// así que usamos URL relativa ('') para evitar mixed content en HTTPS.
// Solo cuando la página viene del servidor de desarrollo aislado
// (frontend/server.js, puerto 3001) apuntamos al backend local (3000).
const DEV_BACKEND_URL = 'http://localhost:3000';

export const API_URL = window.location.port === '3001' ? DEV_BACKEND_URL : '';