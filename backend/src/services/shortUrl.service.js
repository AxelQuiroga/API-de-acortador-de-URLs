import shortUrlRepository from "../repositories/shortUrl.repository.js";
import shortCodeGenerator from "../utils/ShortCodeGenerator.js";
import CreateShortUrlResponseDto from "../dto/responses/createShortUrlResponseDto.js";
import ShortUrlInfoResponseDto from "../dto/responses/shortUrlInfoResponseDto.js";
import { InvalidUrlError } from "../errors/invalidUrlError.js";
import { ShortUrlNotFoundError } from "../errors/shortUrlNotFoundError.js";
import { ShortUrlExpiredError } from "../errors/shortUrlExpiredError.js";
import { DomainError } from "../errors/domainError.js";
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
                    continue;
                }
                throw err;
            }
        }

        throw new DomainError('No se pudo generar un código único, intentá de nuevo', 503);
    }

    async resolveShortUrl(shortCode) {
        this.#validateShortCode(shortCode);
        const shortUrlDoc = await this.#getValidShortUrl(shortCode);

        // The repository increments only while the record is still unexpired.
        // A null result means it expired between the read and the atomic update.
        const updated = await this.shortUrlRepository.incrementVisits(shortCode, new Date());
        if (updated === null) {
            await this.#getValidShortUrl(shortCode); // Throws the correct 404/410 domain error.
            throw new DomainError("No se pudo registrar la visita, intentá de nuevo", 503);
        }

        return shortUrlDoc.originalUrl;
    }

    async getShortUrlInfo(shortCode) {
        this.#validateShortCode(shortCode);
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
        if (typeof originalUrl !== "string" || originalUrl.length === 0 || originalUrl.length > 2048) {
            throw new InvalidUrlError("La URL debe tener entre 1 y 2048 caracteres");
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(originalUrl);
        } catch {
            throw new InvalidUrlError("La URL no es válida");
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            throw new InvalidUrlError("Solo se permiten URLs http/https");
        }
        if (parsedUrl.username || parsedUrl.password) {
            throw new InvalidUrlError("No se permiten credenciales dentro de la URL");
        }
        if (!parsedUrl.hostname) {
            throw new InvalidUrlError("La URL debe incluir un dominio válido");
        }

        return parsedUrl;
    }



    #validateShortCode(shortCode) {
        if (typeof shortCode !== "string" || !/^[A-Za-z0-9]{6}$/.test(shortCode)) {
            throw new InvalidUrlError("El código debe tener exactamente 6 caracteres alfanuméricos");
        }
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
