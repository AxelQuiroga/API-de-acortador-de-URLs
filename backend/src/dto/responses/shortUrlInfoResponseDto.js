class ShortUrlInfoResponseDto {

    constructor({ shortCode, originalUrl, shortUrl, visits, createdAt, expiresAt }) {
        this.shortCode = shortCode;
        this.originalUrl = originalUrl;
        this.shortUrl = shortUrl;
        this.visits = visits;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

}

export default ShortUrlInfoResponseDto;
