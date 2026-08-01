import shortUrlRepository from "../repositories/shortUrl.repository.js";
import shortCodeGenerator from "../utils/ShortCodeGenerator.js";

const EXPIRATION_DAYS = 30;
class ShortUrlService {

    constructor() {
        this.shortUrlRepository = shortUrlRepository;
        this.shortCodeGenerator = shortCodeGenerator;
    }
    async createShortUrl(dto) {
        const {originalUrl} = dto;
        
        
            new URL(originalUrl);
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * EXPIRATION_DAYS);
            let shortCode = this.shortCodeGenerator.generate();

            let existingShortUrl = await this.shortUrlRepository.findByShortCode(shortCode);
            

            while(existingShortUrl){
                shortCode = this.shortCodeGenerator.generate();
                existingShortUrl = await this.shortUrlRepository.findByShortCode(shortCode);
            }
            
            
            const shortUrl = await this.shortUrlRepository.create({originalUrl, shortCode, expiresAt});
            return new CreateShortUrlReponseDTO(shortUrl);
      
    }
}

export default new ShortUrlService();