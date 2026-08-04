import rateLimit from "express-rate-limit";

/**
 * Factory de express-rate-limit con configuración consistente
 * (headers estándar, mensaje de error en español).
 * @param {{ windowMs: number, max: number }} options
 */
export const createRateLimiter = ({ windowMs, max }) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas peticiones, intentá de nuevo más tarde' },
    });
