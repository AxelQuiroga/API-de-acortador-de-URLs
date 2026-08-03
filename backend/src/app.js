import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import shortUrlRoutes from "./routes/shortUrl.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ShortUrlNotFoundError } from "./errors/shortUrlNotFoundError.js";
import { env } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy (detrás de Render/Railway/Nginx)
app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({ origin: env.CORS_ORIGIN }));

// Límite de 10KB para el body
app.use(express.json({ limit: '10kb' }));

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Servir frontend estático (mismo origen, sin CORS)
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rate limiting en POST /api/shorten
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones, intentá de nuevo más tarde' },
});
app.use('/api/shorten', limiter);

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
