import ShortUrl from "../models/shortUrl.model.js";

class ShortUrlRepository {
    async create(shortUrl) {
        return ShortUrl.create(shortUrl);
    }

    async findByShortCode(shortCode) {
        return ShortUrl.findOne( {shortCode},
            { $inc: { visits: 1}},
            { new: true}
        )

    }

    async incrementVisits(shortCode) {
        return ShortUrl.findOneAndUpdate({shortCode}, {$inc: {visits: 1}})
    }
}

export default new ShortUrlRepository();