import { DomainError } from "../errors/domainError.js";

export const errorHandler = (err, req, res, next) => {
    if (err instanceof DomainError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
};
