import shortUrlRepository from "../repositories/shortUrl.repository.js";
import shortCodeGenerator from "../utils/ShortCodeGenerator.js";
import CreateShortUrlResponseDto from "../dto/responses/createShortUrlResponseDto.js";
import ShortUrlInfoResponseDto from "../dto/responses/shortUrlInfoResponseDto.js";
import { InvalidUrlError } from "../errors/invalidUrlError.js";
import { ShortUrlNotFoundError } from "../errors/shortUrlNotFoundError.js";
import { ShortUrlExpiredError } from "../errors/shortUrlExpiredError.js";
import { env } from "../config/env.js";

const EXPIRATION_DAYS = 30;

class ShortUrlService {
    constructor(repository = shortUrlRepository, generator = shortCodeGenerator) {
        this.shortUrlRepository = repository;
        this.shortCodeGenerator = generator;
    }

    async createShortUrl(dto) {
        const { originalUrl } = dto;

        this.#parseAndValidateUrl(originalUrl);

        const MAX_RETRIES = 5;
        let lastError;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const shortCode = this.shortCodeGenerator.generate();
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * EXPIRATION_DAYS);

            try {
                const shortUrlDoc = await this.shortUrlRepository.create({ originalUrl, shortCode, expiresAt });
                return new CreateShortUrlResponseDto({
                    shortCode: shortUrlDoc.shortCode,
                    shortUrl: `${env.BASE_URL}/${shortUrlDoc.shortCode}`,
                    expiresAt: shortUrlDoc.expiresAt,
                });
            } catch (err) {
                if (err.code === 11000) {
                    lastError = err;
                    continue;
                }
                throw err;
            }
        }

        throw lastError;
    }

    async resolveShortUrl(shortCode) {
        const shortUrlDoc = await this.#getValidShortUrl(shortCode);

        await this.shortUrlRepository.incrementVisits(shortCode);
        
        return shortUrlDoc.originalUrl;
    }

    async getShortUrlInfo(shortCode) {
        const shortUrlDoc = await this.#getValidShortUrl(shortCode);

        return new ShortUrlInfoResponseDto({
            shortCode: shortUrlDoc.shortCode,
            originalUrl: shortUrlDoc.originalUrl,
            shortUrl: `${env.BASE_URL}/${shortUrlDoc.shortCode}`,
            visits: shortUrlDoc.visits,
            createdAt: shortUrlDoc.createdAt,
            expiresAt: shortUrlDoc.expiresAt,
        });
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



    async #getValidShortUrl(shortCode) {
        const shortUrlDoc = await this.shortUrlRepository.findByShortCode(shortCode);

        if (!shortUrlDoc) {
            throw new ShortUrlNotFoundError();
        }
        
        if (shortUrlDoc.expiresAt < new Date()) {
            throw new ShortUrlExpiredError();
        }
        
        return shortUrlDoc;
    }
}

export default new ShortUrlService();
export { ShortUrlService };
