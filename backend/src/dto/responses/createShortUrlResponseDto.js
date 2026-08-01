class CreateShortUrlResponseDto {

    constructor({ shortCode, shortUrl, expiresAt }) {
        this.shortCode = shortCode;
        this.shortUrl = shortUrl;
        this.expiresAt = expiresAt;
    }

}

export default CreateShortUrlResponseDto;