import { DomainError } from "./domainError.js";

export class InvalidUrlError extends DomainError {
    constructor(message = "Invalid URL provided") {
        super(message, 400);
    }
}