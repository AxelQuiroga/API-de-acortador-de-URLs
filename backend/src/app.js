import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import shortUrlRoutes from "./routes/shortUrl.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { env } from "./config/env.js";

const app = express();

app.use(helmet());

app.use(cors({ origin: env.CORS_ORIGIN }));

app.use(express.json());

app.use(morgan("dev"));

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK"
    });
});

app.use(shortUrlRoutes);

app.use(errorHandler);

export default app;
