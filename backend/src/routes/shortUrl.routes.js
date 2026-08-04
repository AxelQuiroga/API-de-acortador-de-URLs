import { Router } from "express";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import shortUrlController from "../controllers/shortUrl.controller.js";

const router = Router();

router.post("/api/shorten", shortUrlController.createShortUrl);
router.get("/api/urls/:shortCode", shortUrlController.getShortUrlInfo);

// Rate limiting en la redirección: cada GET hace un $inc en la DB, así que
// un script/bot podría martillarla sin costo. 300 req / 15 min / IP.
const redirectLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 });
router.get("/:shortCode", redirectLimiter, shortUrlController.resolveShortUrl);

export default router;
