import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ShortUrlService } from "../src/services/shortUrl.service.js";
import { InvalidUrlError } from "../src/errors/invalidUrlError.js";
import { ShortUrlNotFoundError } from "../src/errors/shortUrlNotFoundError.js";
import { ShortUrlExpiredError } from "../src/errors/shortUrlExpiredError.js";
import { env } from "../src/config/env.js";

const fakeGenerator = { generate: () => "abc123" };

const createFakeRepository = (overrides = {}) => ({
    create: async (data) => ({
        shortCode: data.shortCode,
        originalUrl: data.originalUrl,
        expiresAt: data.expiresAt,
    }),
    findByShortCode: async () => null,
    incrementVisits: async () => null,
    ...overrides,
});

describe("ShortUrlService", () => {
    describe("createShortUrl", () => {
        test("returns DTO with shortCode, shortUrl and expiresAt", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);

            const result = await service.createShortUrl({ originalUrl: "https://google.com" });

            assert.equal(result.shortCode, "abc123");
            assert.equal(result.shortUrl, `${env.BASE_URL}/abc123`);
            assert.ok(result.expiresAt instanceof Date);
            assert.ok(result.expiresAt > new Date());
        });

        test("throws InvalidUrlError for 'no-es-una-url'", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);

            await assert.rejects(
                service.createShortUrl({ originalUrl: "no-es-una-url" }),
                InvalidUrlError
            );
        });

        test("throws InvalidUrlError for 'ftp://x.com'", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);

            await assert.rejects(
                service.createShortUrl({ originalUrl: "ftp://x.com" }),
                InvalidUrlError
            );
        });

        test("retries code generation when the code collides", async () => {
            let findByShortCodeCalls = 0;
            let generateCalls = 0;

            const repository = createFakeRepository({
                findByShortCode: async () => {
                    findByShortCodeCalls += 1;
                    return findByShortCodeCalls === 1 ? { shortCode: "abc123" } : null;
                },
            });

            const generator = {
                generate: () => {
                    generateCalls += 1;
                    return "abc123";
                },
            };

            const service = new ShortUrlService(repository, generator);
            const result = await service.createShortUrl({ originalUrl: "https://google.com" });

            assert.equal(generateCalls, 2);
            assert.equal(result.shortCode, "abc123");
        });
    });

    describe("resolveShortUrl", () => {
        const doc = {
            shortCode: "abc123",
            originalUrl: "https://google.com",
            expiresAt: new Date(Date.now() + 60_000),
        };

        test("returns originalUrl and increments visits once", async () => {
            let incrementCalls = 0;

            const repository = createFakeRepository({
                findByShortCode: async () => doc,
                incrementVisits: async () => {
                    incrementCalls += 1;
                },
            });

            const service = new ShortUrlService(repository, fakeGenerator);
            const originalUrl = await service.resolveShortUrl("abc123");

            assert.equal(originalUrl, "https://google.com");
            assert.equal(incrementCalls, 1);
        });

        test("throws ShortUrlNotFoundError when the code does not exist", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);

            await assert.rejects(service.resolveShortUrl("nope"), ShortUrlNotFoundError);
        });

        test("throws ShortUrlExpiredError when expiresAt is in the past", async () => {
            const repository = createFakeRepository({
                findByShortCode: async () => ({
                    ...doc,
                    expiresAt: new Date(Date.now() - 60_000),
                }),
            });

            const service = new ShortUrlService(repository, fakeGenerator);

            await assert.rejects(service.resolveShortUrl("abc123"), ShortUrlExpiredError);
        });
    });

    describe("getShortUrlInfo", () => {
        const createdAt = new Date("2026-01-01T00:00:00.000Z");
        const doc = {
            shortCode: "abc123",
            originalUrl: "https://google.com",
            visits: 7,
            createdAt,
            expiresAt: new Date(Date.now() + 60_000),
        };

        test("returns info shape without incrementing visits", async () => {
            let incrementCalls = 0;

            const repository = createFakeRepository({
                findByShortCode: async () => doc,
                incrementVisits: async () => {
                    incrementCalls += 1;
                },
            });

            const service = new ShortUrlService(repository, fakeGenerator);
            const info = await service.getShortUrlInfo("abc123");

            assert.equal(info.shortCode, "abc123");
            assert.equal(info.originalUrl, "https://google.com");
            assert.equal(info.shortUrl, `${env.BASE_URL}/abc123`);
            assert.equal(info.visits, 7);
            assert.equal(info.createdAt, createdAt);
            assert.equal(info.expiresAt, doc.expiresAt);
            assert.equal(incrementCalls, 0);
        });

        test("throws ShortUrlNotFoundError when the code does not exist", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);

            await assert.rejects(service.getShortUrlInfo("nope"), ShortUrlNotFoundError);
        });

        test("throws ShortUrlExpiredError when expiresAt is in the past", async () => {
            const repository = createFakeRepository({
                findByShortCode: async () => ({
                    ...doc,
                    expiresAt: new Date(Date.now() - 60_000),
                }),
            });

            const service = new ShortUrlService(repository, fakeGenerator);

            await assert.rejects(service.getShortUrlInfo("abc123"), ShortUrlExpiredError);
        });
    });
});
