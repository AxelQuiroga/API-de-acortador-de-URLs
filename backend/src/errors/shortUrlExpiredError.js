import { DomainError } from "./domainError.js";

export class ShortUrlExpiredError extends DomainError {
    constructor(message = "Short URL has expired") {
        super(message, 410);
    }
}