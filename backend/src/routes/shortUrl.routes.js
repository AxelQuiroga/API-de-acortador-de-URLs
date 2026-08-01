import { Router } from "express";
import shortUrlController from "../controllers/shortUrl.controller.js";

const router = Router();

router.post("/api/shorten", shortUrlController.createShortUrl);
router.get("/api/urls/:shortCode", shortUrlController.getShortUrlInfo);
router.get("/:shortCode", shortUrlController.resolveShortUrl);

export default router;
