import shortUrlService from "../services/shortUrl.service.js";
import { CreateShortUrlRequestDto } from "../dto/requests/createShortUrlRequestDto.js";

class ShortUrlController {
    async createShortUrl(req, res) {
        const dto = new CreateShortUrlRequestDto(req.body.originalUrl);
        const response = await shortUrlService.createShortUrl(dto);
        res.status(201).json(response);
    }

    async resolveShortUrl(req, res) {
        const originalUrl = await shortUrlService.resolveShortUrl(req.params.shortCode);
        res.redirect(302, originalUrl);
    }
}

export default new ShortUrlController();
