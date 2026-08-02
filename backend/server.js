import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDatabase } from "./src/config/database.js";
import mongoose from "mongoose";

const startServer = async () => {
    try {
        await connectDatabase();

        const server = app.listen(env.PORT, () => {
            console.log(`Server running on http://localhost:${env.PORT}`);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`${signal} recibido, cerrando conexiones...`);
            server.close(() => {
                console.log('Servidor HTTP cerrado.');
            });
            await mongoose.disconnect();
            console.log('Conexión a MongoDB cerrada.');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
