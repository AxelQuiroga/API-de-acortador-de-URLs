import { DomainError } from "../errors/domainError.js";
import { env } from "../config/env.js";

const errorPage = ({ title, message }) => `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f4f6f8;
            color: #1a202c;
        }
        main {
            text-align: center;
            max-width: 480px;
            padding: 3rem 2rem;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }
        h1 {
            font-size: 1.75rem;
            margin: 0 0 1rem;
        }
        p {
            font-size: 1.05rem;
            line-height: 1.6;
            color: #4a5568;
            margin: 0 0 1.75rem;
        }
        a {
            color: #2563eb;
            font-weight: 600;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <main>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="${env.FRONTEND_URL}">Volver al inicio</a>
    </main>
</body>
</html>
`;

export const errorHandler = (err, req, res, next) => {
    if ((err.statusCode === 404 || err.statusCode === 410) && req.accepts("html")) {
        const html =
            err.statusCode === 404
                ? errorPage({
                    title: "URL no encontrada",
                    message: "El código que buscaste no existe o ya fue eliminado.",
                  })
                : errorPage({
                    title: "URL expirada",
                    message: "Esta URL corta venció. Creá una nueva desde el inicio.",
                  });

        return res.status(err.statusCode).type("html").send(html);
    }

    if (err instanceof DomainError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
};
