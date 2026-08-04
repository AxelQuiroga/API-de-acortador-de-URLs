import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { createRateLimiter } from "./middlewares/rateLimit.js";
import shortUrlRoutes from "./routes/shortUrl.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ShortUrlNotFoundError } from "./errors/shortUrlNotFoundError.js";
import { env } from "./config/env.js";

const app = express();



// Trust proxy: SOLO cuando corre detrás de un proxy (Render/Railway/Nginx).
// Si el server está expuesto directo, confiar en X-Forwarded-For permitiría
// spoofear la IP y bypasear el rate limit.
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

app.use(helmet());

app.use(cors({ origin: env.CORS_ORIGIN }));

// Límite de 10KB para el body
app.use(express.json({ limit: '10kb' }));

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Servir frontend estático (mismo origen, sin CORS)
//app.use(express.static(path.join(__dirname, '../../frontend')));

// Rate limiting en POST /api/shorten (100 req / 15 min / IP)
app.use('/api/shorten', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health check con verificación de DB
app.get("/health", (req, res) => {
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
        res.status(200).json({ status: "OK" });
    } else {
        res.status(503).json({ status: "ERROR", message: "Database not connected" });
    }
});

app.use(shortUrlRoutes);

// 404 para rutas no matcheadas
app.use((req, res, next) => {
    next(new ShortUrlNotFoundError());
});

app.use(errorHandler);

export default app;
