export class CreateShortUrlReponseDTO {
    constructor({shortUrl, shortCode, expiresAt}) {
        this.shortUrl = shortUrl;
        this.shortCode = shortCode;
        this.expiresAt = expiresAt;
    }


}