# URL Shortener API

API de acortamiento de URLs: recibís una URL original y el sistema genera una URL corta con código único de 6 caracteres.

```
POST /api/shorten
Entrada:  {"originalUrl": "https://google.com"}
Salida:   {"shortCode": "aB92xQ", "shortUrl": "http://localhost:3000/aB92xQ", "expiresAt": "2026-08-31T16:05:50.321Z"}
```

## Funcionalidades

- Crear URLs cortas (código alfanumérico único de 6 caracteres)
- Evitar colisiones de código (el Service regenera si ya existe)
- Contar visitas por URL corta
- Expiración a los 30 días (410 Gone al vencer)
- Redirección con HTTP 302
- Validación: solo URLs `http`/`https` (400 en caso contrario)

## Stack

- Node.js + Express 5 (JavaScript, ES Modules)
- MongoDB + Mongoose 9
- Zod (validación de env)
- Helmet, CORS, Morgan
- pnpm

## Requisitos

- Node.js 20+
- MongoDB corriendo localmente (default: `mongodb://127.0.0.1:27017`)
- pnpm

## Puesta en marcha

```bash
pnpm install

# Configurá el entorno
Copy-Item backend/.env.example backend/.env   # y ajustá si hace falta

# Modo desarrollo (con auto-reload)
pnpm --dir backend dev

# Producción
pnpm --dir backend start
```

## API

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| `POST` | `/api/shorten` | Crea una URL corta. Body: `{"originalUrl": "https://..."}` | `201` con `{shortCode, shortUrl, expiresAt}` · `400` URL inválida o JSON malformado |
| `GET` | `/:shortCode` | Redirige a la URL original | `302` + `Location` · `404` código inexistente · `410` URL vencida |
| `GET` | `/health` | Health check | `200` |

### Ejemplos

```bash
# Crear una URL corta
curl -X POST -H "Content-Type: application/json" \
  --data-binary "@body.json" \
  http://localhost:3000/api/shorten
# body.json: {"originalUrl":"https://google.com"}

# Visitar una URL corta (redirige)
curl -i http://localhost:3000/aB92xQ

# Errores de dominio
GET /zzzzzz   → 404 {"error":"Short URL not found"}
GET /vencida  → 410 {"error":"Short URL has expired"}
POST ftp://   → 400 {"error":"Solo se permiten URLs http/https"}
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
│   ├── config/          # env (zod) y conexión a Mongo
│   ├── controllers/     # capa HTTP
│   ├── dto/             # DTOs de request/response
│   ├── errors/          # DomainError + subclases
│   ├── middlewares/     # errorHandler
│   ├── models/          # schema de Mongoose
│   ├── repositories/    # persistencia
│   ├── routes/          # definición de rutas
│   ├── services/        # lógica de negocio
│   └── utils/           # ShortCodeGenerator
├── server.js            # bootstrap
└── .env.example
frontend/                # pendiente
```

## Estado

- Backend: completo y verificado end-to-end (201/302/400/404/410, health y conteo de visitas).
- Frontend: pendiente (carpeta vacía).
