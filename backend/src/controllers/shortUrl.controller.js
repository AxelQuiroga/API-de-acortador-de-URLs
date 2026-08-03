import shortUrlService from "../services/shortUrl.service.js";
import { CreateShortUrlRequestDto } from "../dto/requests/createShortUrlRequestDto.js";
import { InvalidUrlError } from "../errors/invalidUrlError.js";

class ShortUrlController {
    async createShortUrl(req, res) {
        if (!req.body || typeof req.body.originalUrl !== 'string' || !req.body.originalUrl.trim()) {
            throw new InvalidUrlError("La URL no es válida");
        }
        const dto = new CreateShortUrlRequestDto(req.body.originalUrl);
        const response = await shortUrlService.createShortUrl(dto);
        res.status(201).json(response);
    }

    async resolveShortUrl(req, res) {
        const { shortCode } = req.params;
        if (!shortCode || shortCode.length !== 6) {
            throw new InvalidUrlError("El código debe tener exactamente 6 caracteres");
        }
        const originalUrl = await shortUrlService.resolveShortUrl(shortCode);
        res.redirect(302, originalUrl);
    }

    async getShortUrlInfo(req, res) {
        const info = await shortUrlService.getShortUrlInfo(req.params.shortCode);
        res.json(info);
    }
}

export default new ShortUrlController();
