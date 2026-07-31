import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDatabase } from "./src/config/database.js";

const startServer = async () => {
    try {
        await connectDatabase();

        app.listen(env.PORT, () => {
            console.log(` Server running on http://localhost:${env.PORT}`);
        })
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();