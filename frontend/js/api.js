import { API_URL } from './config.js';

export async function createShortUrl(originalUrl) {
    const res = await fetch(`${API_URL}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw { status: res.status, message: data.error };
    }

    return data;
}

export async function getShortUrlInfo(shortCode) {
    const res = await fetch(`${API_URL}/api/urls/${shortCode}`);
    const data = await res.json();

    if (!res.ok) {
        throw { status: res.status, message: data.error };
    }

    return data;
}
