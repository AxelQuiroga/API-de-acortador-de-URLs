import { randomInt } from "node:crypto";

class ShortCodeGenerator {
    constructor() {
        this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    }

    generate(length = 6) {
        let code = "";
        for(let i = 0; i < length; i++) {
            code += this.alphabet.charAt(randomInt(0, this.alphabet.length));
            
        }
    return code;
    }
}

export default new ShortCodeGenerator();