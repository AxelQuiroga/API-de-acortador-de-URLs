# URL Shortener API

API de acortamiento de URLs: recibís una URL original y el sistema genera una URL corta con código único de 6 caracteres.

```
POST /api/shorten
Entrada:  {"originalUrl": "https://google.com"}
Salida:   {"shortCode": "aB92xQ", "shortUrl": "https://tu-app.onrender.com/aB92xQ", "expiresAt": "2026-08-31T16:05:50.321Z"}
```

## Funcionalidades

- Crear URLs cortas (código alfanumérico único de 6 caracteres)
- Evitar colisiones de código (reintenta hasta 5 veces en caso de E11000)
- Contar visitas por URL corta
- Expiración a los 30 días (410 Gone al vencer)
- Redirección con HTTP 302
- Validación: solo URLs `http`/`https` (400 en caso contrario)
- Rate limiting: 100 requests por 15 minutos en POST /api/shorten y 300 por 15 minutos en GET /:shortCode
- Body limit: 10KB máximo
- Content negotiation: API routes siempre retornan JSON, rutas no-API retornan HTML para errores 404/410
- Health check con verificación de estado de MongoDB
- Graceful shutdown (SIGTERM/SIGINT)
- Frontend servido desde Express (mismo origen, sin CORS)

## Stack

- Node.js + Express 5 (JavaScript, ES Modules)
- MongoDB + Mongoose 9
- Zod (validación de env)
- Helmet, CORS, Morgan, express-rate-limit
- pnpm

## Requisitos

- Node.js 20+ (`engines` configurado en package.json)
- MongoDB corriendo localmente (default: `mongodb://127.0.0.1:27017`)
- pnpm

## Puesta en marcha

```bash
# Backend (sirve API + frontend)
cd backend
pnpm install
Copy-Item .env.example .env   # ajustá si hace falta
pnpm dev                      # http://localhost:3000 (API + frontend)

# Desarrollo front aislado (opcional, solo hot reload)
cd frontend
pnpm install
pnpm dev                      # http://localhost:3001 (solo para desarrollo)
```

> **Deploy:** En producción, Express sirve el frontend estático desde `GET /`. No necesitás un servidor separado.

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `PORT` | No | `3000` | Puerto del servidor |
| `MONGODB_URI` | **Sí** | — | URI de conexión a MongoDB (ej: `mongodb://127.0.0.1:27017/url-shortener`) |
| `BASE_URL` | No | `http://localhost:3000` | URL base para generar links cortos (ej: `https://tu-dominio.com`) |
| `CORS_ORIGIN` | No | `*` | Origen(es) permitidos para CORS, separados por coma (ej: `https://a.com,https://b.com`) |
| `FRONTEND_URL` | No | `http://localhost:3001` | URL del frontend para links en páginas de error |
| `NODE_ENV` | No | `development` | `development` o `production` |

> **Producción:** `CORS_ORIGIN` no puede ser `*`, y `BASE_URL`/`FRONTEND_URL` no pueden contener `localhost`, `127.0.0.1` ni `0.0.0.0`. `CORS_ORIGIN` acepta múltiples orígenes separados por coma.

## API

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| `POST` | `/api/shorten` | Crea una URL corta. Body: `{"originalUrl": "https://..."}` | `201` con `{shortCode, shortUrl, expiresAt}` · `400` URL inválida o JSON malformado |
| `GET` | `/:shortCode` | Redirige a la URL original (solo códigos de 6 chars alfanuméricos) | `302` + `Location` · `404` código inexistente · `410` URL vencida |
| `GET` | `/api/urls/:shortCode` | Info de la URL (visitas, expiración, destino) | `200` JSON · `404` · `410` |
| `GET` | `/health` | Health check con estado de DB | `200` OK · `503` DB no conectada |
| `GET` | `/` | Frontend (servido desde Express) | `200` HTML |

### Ejemplos

```bash
# Crear una URL corta
curl -X POST -H "Content-Type: application/json" \
  --data-binary "@body.json" \
  http://localhost:3000/api/shorten
# body.json: {"originalUrl":"https://google.com"}

# Consultar info de una URL corta (visitas, expiración, destino)
curl http://localhost:3000/api/urls/aB92xQ

# Visitar una URL corta (redirige)
curl -i http://localhost:3000/aB92xQ

# Errores de dominio
GET /zzzzzz        → 404 {"error":"URL no encontrada"}
GET /vencida       → 410 {"error":"URL expirada"}
POST ftp://        → 400 {"error":"Solo se permiten URLs http/https"}
POST sin body      → 400 {"error":"La URL no es válida"}
```

## Arquitectura

Separación por capas — el Controller no conoce Mongo, el Service no conoce HTTP, el Repository no decide nada:

```
Controller  → traduce HTTP ↔ servicio
    ↓
Service     → reglas del negocio (validación, expiración, códigos, colisiones)
    ↓
Repository  → persistencia (MongoDB)
    ↓
Model       → schema de Mongoose
```

Los errores de dominio se modelan con `DomainError` (con `statusCode`) y subclases:

- `InvalidUrlError` → 400
- `ShortUrlNotFoundError` → 404
- `ShortUrlExpiredError` → 410

El error middleware mapea `DomainError` (y errores de Express/body-parser que traen `statusCode`) a responses JSON; cualquier otra cosa es 500.

## Estructura

```
backend/
├── src/
│   ├── config/          # env (zod + superRefine) y conexión a Mongo
│   ├── controllers/     # capa HTTP
│   ├── dto/             # DTOs de request/response
│   ├── errors/          # DomainError + subclases
│   ├── middlewares/     # errorHandler
│   ├── models/          # schema de Mongoose (autoIndex: false)
│   ├── repositories/    # persistencia
│   ├── routes/          # definición de rutas (/:shortCode con regex)
│   ├── services/        # lógica de negocio
│   └── utils/           # ShortCodeGenerator
├── server.js            # bootstrap + graceful shutdown
└── .env.example

frontend/
├── index.html           # página única
├── css/styles.css       # estilos (mobile-first BEM)
├── js/
│   ├── config.js        # API_URL (relativo al mismo origen)
│   ├── api.js           # fetch wrappers
│   └── app.js           # DOM, eventos, render, localStorage
└── server.js            # mini server Node (solo desarrollo local)
```

## Tests

```bash
cd backend
pnpm test
```

- **Unit tests** (`tests/shortUrl.service.test.js`): Service con repositorio fake, cubre creación, validación, colisiones (E11000), resolución, info sin incrementar visitas.
- **Integration tests** (`tests/shortUrl.api.test.js`): Supertest + MongoDB real, cubre todos los endpoints, content negotiation (API routes siempre JSON), health check, idempotentes (limpian sus datos).

## Deploy

```bash
# Render / Railway (un solo servicio)
# 1. Conectá tu repo
# 2. Seteá las variables de entorno en el panel
# 3. Build command: cd backend && pnpm install
# 4. Start command: cd backend && pnpm start
# 5. Health check path: /health
```

> **Importante:** `frontend/server.js` es solo para desarrollo local. En producción, Express sirve el frontend desde `express.static`.

> **Obligatorio:** seteá `NODE_ENV=production` en el panel. Además de activar las optimizaciones y los guards de env, es lo que habilita `trust proxy` (para que el rate limit vea la IP real del cliente detrás del proxy). Sin `NODE_ENV=production`, todo el tráfico comparte un solo bucket de rate limit y el sitio podría responder 429 masivamente.
