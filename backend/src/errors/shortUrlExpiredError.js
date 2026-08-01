import { DomainError } from "./domainError.js";

export class ShortUrlExpiredError extends DomainError {
    constructor(message = "URL expirada") {
        super(message, 410);
    }
}