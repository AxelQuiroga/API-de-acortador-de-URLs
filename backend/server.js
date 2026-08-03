import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDatabase } from "./src/config/database.js";
import mongoose from "mongoose";

const startServer = async () => {
    try {
        console.log("Conectando a MongoDB...");
        await connectDatabase();
        console.log("MongoDB conectado, iniciando servidor HTTP...");

        const server = app.listen(env.PORT, () => {
            console.log(`Server running on http://localhost:${env.PORT}`);
        });

        // Graceful shutdown
        let isShuttingDown = false;
        const shutdown = async (signal) => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            console.log(`${signal} recibido, cerrando conexiones...`);

            // Forzar salida después de 10s si algo se cuelga
            const forceExit = setTimeout(() => {
                console.error('Forzando salida después de 10s');
                process.exit(1);
            }, 10000);
            forceExit.unref();

            try {
                await new Promise((resolve, reject) => {
                    server.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log('Servidor HTTP cerrado.');
            } catch (err) {
                console.error('Error cerrando servidor HTTP:', err.message);
            }

            try {
                await mongoose.disconnect();
                console.log('Conexión a MongoDB cerrada.');
            } catch (err) {
                console.error('Error desconectando MongoDB:', err.message);
            }

            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error("Failed to start server:", error.message || error);
        process.exit(1);
    }
};

startServer();
