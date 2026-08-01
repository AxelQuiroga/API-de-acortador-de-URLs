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
- Express
- JavaScript ES Modules
- MongoDB
- Mongoose
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

La unicidad del código será responsabilidad del Service.

Flujo:

Generar código

↓

Buscar si existe

↓

Si existe generar otro

↓

Guardar


El generador NO verifica la base de datos.


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

## BASE_URL

La URL corta completa se construye en el Service como `BASE_URL + "/" + shortCode`.

`BASE_URL` vive en el env (zod, con default `http://localhost:3000`), sin slash final. Una sola fuente de verdad.

## Validación de URLs

El Service valida las URLs: solo se aceptan `http:` y `https:`. El parseo fallido se envuelve en `InvalidUrlError` — nunca sale un TypeError de Node del Service.

## URL vencida

Una URL expirada responde 410 Gone (existió pero ya no está). El 404 queda para códigos que nunca existieron.

## Métodos privados en el Service

La validación de URLs y la generación de códigos únicos son métodos privados (`#`) del Service, para que los métodos públicos lean como una lista de intenciones a un solo nivel de abstracción.


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