import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app.js";
import ShortUrl from "../src/models/shortUrl.model.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/url-shortener";

// Códigos únicos por corrida: nunca tocan datos generados por otras corridas.
const createdShortCodes = [];
const uniqueCode = (prefix) =>
    `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

describe("Short URL API", () => {
    before(async () => {
        await mongoose.connect(MONGODB_URI);
    });

    after(async () => {
        if (createdShortCodes.length > 0) {
            await ShortUrl.deleteMany({ shortCode: { $in: createdShortCodes } });
        }
        await mongoose.disconnect();
    });

    test("GET /health returns 200", async () => {
        const res = await request(app).get("/health");

        assert.equal(res.status, 200);
        assert.equal(res.body.status, "OK");
    });

    test("POST /api/shorten creates a short URL", async () => {
        const res = await request(app)
            .post("/api/shorten")
            .set("Accept", "application/json")
            .send({ originalUrl: "https://google.com" });

        assert.equal(res.status, 201);
        assert.ok(res.body.shortCode);
        assert.ok(res.body.shortUrl);
        assert.ok(res.body.expiresAt);

        createdShortCodes.push(res.body.shortCode);
    });

    test("POST /api/shorten rejects 'no-es-una-url' with 400 JSON", async () => {
        const res = await request(app)
            .post("/api/shorten")
            .set("Accept", "application/json")
            .send({ originalUrl: "no-es-una-url" });

        assert.equal(res.status, 400);
        assert.ok(res.body.error);
    });

    test("POST /api/shorten rejects 'ftp://x.com' with 400 JSON", async () => {
        const res = await request(app)
            .post("/api/shorten")
            .set("Accept", "application/json")
            .send({ originalUrl: "ftp://x.com" });

        assert.equal(res.status, 400);
        assert.ok(res.body.error);
    });

    test("GET /:shortCode redirects to the original URL", async () => {
        const createRes = await request(app)
            .post("/api/shorten")
            .set("Accept", "application/json")
            .send({ originalUrl: "https://google.com" });

        const shortCode = createRes.body.shortCode;
        createdShortCodes.push(shortCode);

        const res = await request(app).get(`/${shortCode}`);

        assert.equal(res.status, 302);
        assert.equal(res.headers.location, "https://google.com");
    });

    test("GET /api/urls/:shortCode returns URL info", async () => {
        const createRes = await request(app)
            .post("/api/shorten")
            .set("Accept", "application/json")
            .send({ originalUrl: "https://example.com/hello" });

        const shortCode = createRes.body.shortCode;
        createdShortCodes.push(shortCode);

        const res = await request(app)
            .get(`/api/urls/${shortCode}`)
            .set("Accept", "application/json");

        assert.equal(res.status, 200);
        assert.equal(res.body.shortCode, shortCode);
        assert.equal(res.body.originalUrl, "https://example.com/hello");
        assert.ok(res.body.shortUrl.includes(`/${shortCode}`));
        assert.equal(res.body.visits, 0);
        assert.ok(res.body.createdAt);
        assert.ok(res.body.expiresAt);
    });

    test("GET /api/urls/:nonexistent returns 404 JSON", async () => {
        const res = await request(app)
            .get("/api/urls/doesnotexist123")
            .set("Accept", "application/json");

        assert.equal(res.status, 404);
        assert.equal(res.body.error, "URL no encontrada");
    });

    test("GET /api/urls/expired returns 410 JSON", async () => {
        const shortCode = uniqueCode("exp");
        createdShortCodes.push(shortCode);

        await ShortUrl.create({
            shortCode,
            originalUrl: "https://expired.example.com",
            expiresAt: new Date(Date.now() - 60_000),
        });

        const res = await request(app)
            .get(`/api/urls/${shortCode}`)
            .set("Accept", "application/json");

        assert.equal(res.status, 410);
        assert.equal(res.body.error, "URL expirada");
    });

    test("GET /api/urls/:nonexistent always returns JSON (even with Accept: text/html)", async () => {
        const res = await request(app)
            .get("/api/urls/doesnotexist123")
            .set("Accept", "text/html");

        assert.equal(res.status, 404);
        assert.match(res.headers["content-type"], /application\/json/);
        assert.equal(res.body.error, "URL no encontrada");
    });
});
