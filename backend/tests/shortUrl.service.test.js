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

        test("retries on E11000 duplicate key and succeeds", async () => {
            let createCalls = 0;

            const repository = createFakeRepository({
                create: async (data) => {
                    createCalls += 1;
                    if (createCalls === 1) {
                        const err = new Error("Duplicate key");
                        err.code = 11000;
                        throw err;
                    }
                    return { shortCode: data.shortCode, originalUrl: data.originalUrl, expiresAt: data.expiresAt };
                },
            });

            const service = new ShortUrlService(repository, fakeGenerator);
            const result = await service.createShortUrl({ originalUrl: "https://google.com" });

            assert.equal(createCalls, 2);
            assert.ok(result.shortCode);
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
                    return doc;
                },
            });

            const service = new ShortUrlService(repository, fakeGenerator);
            const originalUrl = await service.resolveShortUrl("abc123");

            assert.equal(originalUrl, "https://google.com");
            assert.equal(incrementCalls, 1);
        });


        test("does not count a visit if the URL expires between lookup and increment", async () => {
            let reads = 0;
            const repository = createFakeRepository({
                findByShortCode: async () => {
                    reads += 1;
                    return reads === 1
                        ? doc
                        : { ...doc, expiresAt: new Date(Date.now() - 1_000) };
                },
                incrementVisits: async () => null,
            });
            const service = new ShortUrlService(repository, fakeGenerator);
            await assert.rejects(service.resolveShortUrl("abc123"), ShortUrlExpiredError);
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

    describe("URL validation hardening", () => {
        test("rejects URLs containing embedded credentials", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);
            await assert.rejects(
                service.createShortUrl({ originalUrl: "https://user:secret@example.com/path" }),
                InvalidUrlError
            );
        });

        test("rejects URLs longer than 2048 characters", async () => {
            const service = new ShortUrlService(createFakeRepository(), fakeGenerator);
            const longUrl = `https://example.com/${"a".repeat(2048)}`;
            await assert.rejects(service.createShortUrl({ originalUrl: longUrl }), InvalidUrlError);
        });

        test("returns a controlled 503 after five duplicate-code collisions", async () => {
            let calls = 0;
            const repository = createFakeRepository({
                create: async () => {
                    calls += 1;
                    const error = new Error("Duplicate key");
                    error.code = 11000;
                    throw error;
                },
            });
            const service = new ShortUrlService(repository, fakeGenerator);
            await assert.rejects(
                service.createShortUrl({ originalUrl: "https://example.com" }),
                (error) => error.statusCode === 503 && /código único/.test(error.message)
            );
            assert.equal(calls, 5);
        });
    });

    describe("short code validation", () => {
        test("rejects malformed short codes before repository access", async () => {
            let reads = 0;
            const repository = createFakeRepository({
                findByShortCode: async () => { reads += 1; return null; },
            });
            const service = new ShortUrlService(repository, fakeGenerator);
            await assert.rejects(service.getShortUrlInfo("abc-12"), InvalidUrlError);
            await assert.rejects(service.resolveShortUrl("abc-12"), InvalidUrlError);
            assert.equal(reads, 0);
        });
    });

});