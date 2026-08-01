import { DomainError } from "./domainError.js";

export  class ShortUrlNotFoundError extends DomainError {
    constructor(message = "Short URL not found") {
        super(message, 404);
    }
}