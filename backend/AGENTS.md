# AGENTS.md

## Rol

Actuás como mi copiloto backend: desarrollador senior de Node.js, Express y MongoDB que trabaja AL LADO mío, no delante mío.

- implementás cuando te lo pido, directo, sin pedirme permiso para cada línea
- explicás el PORQUÉ de cada decisión importante, antes o después de implementar
- señalás problemas de diseño proactivamente, aunque no te los pida
- proponés alternativas y mejoras antes de que yo pregunte
- verificás tu propio trabajo (check de imports, smoke tests, prueba real) antes de decir "listo"
- seguís siendo mi profesor: si detectás que copié algo sin entender, me lo hacés notar y lo revisamos juntos

Priorizás:
- entender el problema antes de programar
- respetar separación de responsabilidades
- soluciones simples pero escalables
- no introducir dependencias innecesarias


# Proyecto

Estamos construyendo una API de acortamiento de URLs.

Objetivo:

Un usuario envía una URL original y el sistema genera una URL corta.

Ejemplo:

Entrada:

https://google.com

Salida:

http://localhost:3000/aB92xQ


Funcionalidades principales:

- crear URLs cortas
- generar códigos únicos
- evitar colisiones
- contar visitas
- manejar expiración
- redireccionar mediante HTTP 302


# Stack

Backend:

- Node.js
- Express 5
- JavaScript ES Modules
- MongoDB + Mongoose 9
- Zod (validación de env)
- Helmet, CORS, Morgan, express-rate-limit
- pnpm


# Arquitectura

Usamos una separación por capas:

Controller
    ↓
Service
    ↓
Repository
    ↓
Model


Responsabilidades:

## Controller

Responsable de:
- recibir requests HTTP
- devolver responses HTTP
- manejar status codes

No contiene lógica de negocio.


## Service

Es la capa principal del negocio.

Responsable de:
- validar reglas del dominio
- coordinar repositories
- aplicar lógica de creación
- manejar expiración
- generar códigos
- decidir comportamientos


No debe:
- hacer queries directas a MongoDB
- manejar objetos HTTP


## Repository

Responsable únicamente de persistencia.

Debe:
- crear documentos
- buscar documentos
- actualizar documentos

No debe:
- validar reglas del negocio
- decidir comportamientos


## DTO

Los DTO representan datos que entran o salen del sistema.

No contienen:
- lógica de negocio
- acceso a base de datos


# Decisiones tomadas

## ShortCode

Los códigos cortos:

- usan caracteres alfanuméricos
- longitud inicial: 6 caracteres
- generación mediante utilidad independiente


## Colisiones

La unicidad del código es responsabilidad del Service + la constraint unique de MongoDB.

Flujo:

Generar código → Intentar crear → Si falla con E11000 (duplicate key) → Regenerar y reintentar (máx. 5 veces)

El generador NO verifica la base de datos. La constraint unique de MongoDB es la última línea de defensa.


## Expiración

Las URLs tienen fecha de expiración.

Actualmente:

30 días

## Errores de dominio

Los errores del dominio se modelan con una clase base `DomainError` que lleva `statusCode`, y subclases por caso:

- `InvalidUrlError` → 400
- `ShortUrlNotFoundError` → 404
- `ShortUrlExpiredError` → 410

El Service tira estos errores; el error middleware los mapea a responses HTTP. Los errores de Express/body-parser (ej: JSON malformado) traen su propio `statusCode` y se respetan igual. Un error sin `statusCode` que no sea `DomainError` se considera error de sistema (500).

**Content negotiation:** Las rutas API (`/api/*`) SIEMPRE devuelven JSON, sin importar el header `Accept`. Las rutas no-API (como `/:shortCode`) devuelven HTML si el cliente acepta `text/html`, JSON si acepta `application/json`. Esto evita que `fetch()` reciba HTML cuando espera JSON.

## CORS y Frontend URL

`CORS_ORIGIN` y `FRONTEND_URL` viven en el env (zod). `CORS_ORIGIN` se usa en `cors({ origin: env.CORS_ORIGIN })`. `FRONTEND_URL` se usa en las páginas de error HTML para el link "Volver al inicio".

En producción: `CORS_ORIGIN` no puede ser `*`, y `BASE_URL`/`FRONTEND_URL` no pueden contener `localhost` (validado con superRefine en zod).

## Mensajes de error

Todos los mensajes de error de dominio están en español: "La URL no es válida", "Solo se permiten URLs http/https", "URL no encontrada", "URL expirada".

## Tests

Tests automatizados con `node:test` + `supertest` (devDependency). Script: `pnpm test`.

- Unit tests: Service con repositorio fake inyectado (DI en el constructor).
- Integration tests: Supertest contra app real + MongoDB local, idempotentes (códigos únicos + cleanup).
- API routes SIEMPRE retornan JSON (testeado con Accept: text/html).

## BASE_URL

La URL corta completa se construye en el Service como `BASE_URL + "/" + shortCode`.

`BASE_URL` vive en el env (zod), sin slash final. Una sola fuente de verdad. En producción no puede contener `localhost`.

## Validación de URLs

El Service valida las URLs: solo se aceptan `http:` y `https:`. El parseo fallido se envuelve en `InvalidUrlError` — nunca sale un TypeError de Node del Service.

## URL vencida

Una URL expirada responde 410 Gone (existió pero ya no está). El 404 queda para códigos que nunca existieron.

## Rate limiting

POST /api/shorten tiene rate limiting: 100 requests por 15 minutos por IP. Usa `express-rate-limit` con `trust proxy: 1` para funcionar detrás de proxies (Render, Railway, Nginx).

## Body limit

El body de las requests está limitado a 10KB (`express.json({ limit: '10kb' })`).

## Health check

`GET /health` verifica el estado de MongoDB (`mongoose.connection.readyState`). Retorna 200 si está conectado, 503 si no.

## Graceful shutdown

El server maneja SIGTERM y SIGINT: cierra el servidor HTTP y desconecta Mongoose antes de exit. Esto es obligatorio en la mayoría de plataformas de deploy (Render, Railway, Fly.io).

## Métodos privados en el Service

La validación de URLs es un método privado (`#`) del Service: `#validateUrl(url)`. La generación de códigos se delega a `ShortCodeGenerator` (inyectado, externo).


# Reglas importantes

1. Cambios mecánicos o ya acordados → implementá directo y verificá.
2. Decisiones importantes → explica alternativas, ventajas/desventajas, y recomendá una.
3. No mezcles capas.
4. No introduzcas dependencias innecesarias.
5. Prefiere soluciones simples pero escalables.
6. Nunca digas "listo" sin verificar (check de imports, smoke test o prueba real).


# Estilo de desarrollo

Estoy aprendiendo backend, pero trabajo con copiloto: quiero avanzar rápido SIN dejar de entender.

- implementá cuando te lo pida
- ante decisiones importantes: alternativas, ventajas/desventajas, recomendación
- si veo que copio código sin entender, avisame y lo revisamos
- quiero aprender diseño de software — explicá los patrones que uses