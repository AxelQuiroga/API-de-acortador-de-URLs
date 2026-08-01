import shortUrlRepository from "../repositories/shortUrl.repository.js";
import shortCodeGenerator from "../utils/ShortCodeGenerator.js";
import CreateShortUrlResponseDto from "../dto/responses/createShortUrlResponseDto.js";
import { InvalidUrlError } from "../errors/invalidUrlError.js";
import { ShortUrlNotFoundError } from "../errors/shortUrlNotFoundError.js";
import { ShortUrlExpiredError } from "../errors/shortUrlExpiredError.js";
import { env } from "../config/env.js";

const EXPIRATION_DAYS = 30;

class ShortUrlService {
    constructor() {
        this.shortUrlRepository = shortUrlRepository;
        this.shortCodeGenerator = shortCodeGenerator;
    }

    async createShortUrl(dto) {
        const { originalUrl } = dto;

        this.#parseAndValidateUrl(originalUrl);

        const shortCode = await this.#generateUniqueShortCode();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * EXPIRATION_DAYS);

        const shortUrlDoc = await this.shortUrlRepository.create({ originalUrl, shortCode, expiresAt });

        return new CreateShortUrlResponseDto({
            shortCode: shortUrlDoc.shortCode,
            shortUrl: `${env.BASE_URL}/${shortUrlDoc.shortCode}`,
            expiresAt: shortUrlDoc.expiresAt,
        });
    }

    async resolveShortUrl(shortCode) {
        const shortUrlDoc = await this.shortUrlRepository.findByShortCode(shortCode);

        if (!shortUrlDoc) {
            throw new ShortUrlNotFoundError();
        }

        if (shortUrlDoc.expiresAt < new Date()) {
            throw new ShortUrlExpiredError();
        }

        await this.shortUrlRepository.incrementVisits(shortCode);
        return shortUrlDoc.originalUrl;
    }

    #parseAndValidateUrl(originalUrl) {
        let parsedUrl;
        try {
            parsedUrl = new URL(originalUrl);
        } catch {
            throw new InvalidUrlError("La URL no es válida");
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            throw new InvalidUrlError("Solo se permiten URLs http/https");
        }

        return parsedUrl;
    }

    async #generateUniqueShortCode() {
        let shortCode = this.shortCodeGenerator.generate();
        while (await this.shortUrlRepository.findByShortCode(shortCode)) {
            shortCode = this.shortCodeGenerator.generate();
        }
        return shortCode;
    }
}

export default new ShortUrlService();
