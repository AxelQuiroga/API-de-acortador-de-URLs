import { DomainError } from "./domainError.js";

export  class ShortUrlNotFoundError extends DomainError {
    constructor(message = "URL no encontrada") {
        super(message, 404);
    }
}