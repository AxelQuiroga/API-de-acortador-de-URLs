import ShortUrl from "../models/shortUrl.model.js";

class ShortUrlRepository {

    async create(shortUrl) {
        return ShortUrl.create(shortUrl);
    }

    async findByShortCode(shortCode) {
        return ShortUrl.findOne({ shortCode });
    }

    async incrementVisits(shortCode, now = new Date()) {
        return ShortUrl.findOneAndUpdate(
            { shortCode, expiresAt: { $gt: now } },
            { $inc: { visits: 1 }},
            { new: true }
        );
    }
}

export default new ShortUrlRepository();