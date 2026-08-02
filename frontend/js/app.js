import { createShortUrl, getShortUrlInfo } from './api.js';

// ── DOM ──────────────────────────────────────────────
const form = document.getElementById('shorten-form');
const urlInput = document.getElementById('url-input');
const submitBtn = document.getElementById('submit-btn');
const errorEl = document.getElementById('error-message');
const resultSection = document.getElementById('result-section');
const shortUrlEl = document.getElementById('short-url');
const copyBtn = document.getElementById('copy-btn');
const openBtn = document.getElementById('open-btn');
const expiresEl = document.getElementById('expires-at');
const infoSection = document.getElementById('info-section');
const infoOriginal = document.getElementById('info-original');
const infoShort = document.getElementById('info-short');
const infoVisits = document.getElementById('info-visits');
const infoCreated = document.getElementById('info-created');
const infoExpires = document.getElementById('info-expires');
const infoClose = document.getElementById('info-close');
const historyList = document.getElementById('history-list');
const clearBtn = document.getElementById('clear-btn');
const emptyHistory = document.getElementById('empty-history');

// ── Estado ───────────────────────────────────────────
let isLoading = false;

// ── localStorage ─────────────────────────────────────
const STORAGE_KEY = 'shortUrls';
const MAX_HISTORY = 20;

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveToHistory(item) {
    try {
        const history = getHistory();
        history.unshift(item);
        if (history.length > MAX_HISTORY) history.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
        // localStorage lleno o no disponible — la URL SÍ se creó
    }
}

function clearAllHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
}

// ── Render ───────────────────────────────────────────
function renderHistory() {
    const history = getHistory();

    if (history.length === 0) {
        historyList.innerHTML = '';
        emptyHistory.classList.remove('hidden');
        clearBtn.classList.add('hidden');
        return;
    }

    emptyHistory.classList.add('hidden');
    clearBtn.classList.remove('hidden');

    historyList.innerHTML = history
        .map(
            (item) => `
        <li class="history-item" data-short-code="${item.shortCode}">
            <div class="history-item__info">
                <span class="history-item__original">${truncate(item.originalUrl, 45)}</span>
                <span class="history-item__short">${item.shortUrl}</span>
            </div>
            <div class="history-item__actions">
                <button class="btn btn--sm btn--copy" data-url="${item.shortUrl}">Copiar</button>
                <a href="${item.shortUrl}" target="_blank" rel="noopener" class="btn btn--sm btn--open">Abrir</a>
            </div>
        </li>`
        )
        .join('');

    // Event listeners para copiar
    historyList.querySelectorAll('.btn--copy').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(btn.dataset.url, btn);
        });
    });

    // Event listener para click en item → info
    historyList.querySelectorAll('.history-item').forEach((el) => {
        el.addEventListener('click', () => showInfo(el.dataset.shortCode));
    });
}

function showResult(data) {
    shortUrlEl.textContent = data.shortUrl;
    openBtn.href = data.shortUrl;
    expiresEl.textContent = `Expira: ${new Date(data.expiresAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    resultSection.classList.remove('hidden');
}

function hideResult() {
    resultSection.classList.add('hidden');
}

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

function hideError() {
    errorEl.classList.add('hidden');
}

function setLoading(loading) {
    isLoading = loading;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Acortando...' : 'Acortar';
    urlInput.disabled = loading;
}

// ── Info (click en historial) ────────────────────────
async function showInfo(shortCode) {
    try {
        const info = await getShortUrlInfo(shortCode);
        infoOriginal.textContent = info.originalUrl;
        infoShort.textContent = info.shortUrl;
        infoVisits.textContent = info.visits;
        infoCreated.textContent = new Date(info.createdAt).toLocaleDateString('es-AR');
        infoExpires.textContent = new Date(info.expiresAt).toLocaleDateString('es-AR');
        infoSection.classList.remove('hidden');
    } catch {
        // Silenciar errores de info — no son críticos
    }
}

// ── Clipboard ────────────────────────────────────────
async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    if (btn) {
        const original = btn.textContent;
        btn.textContent = '¡Copiado!';
        btn.classList.add('btn--success');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('btn--success');
        }, 2000);
    }
}

// ── Helpers ──────────────────────────────────────────
function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Eventos ──────────────────────────────────────────
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const url = urlInput.value.trim();

    if (!url) {
        showError('Pegá una URL');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('La URL debe empezar con http:// o https://');
        return;
    }

    hideError();
    hideResult();
    setLoading(true);

    try {
        const data = await createShortUrl(url);
        showResult(data);
        saveToHistory({
            shortCode: data.shortCode,
            originalUrl: url,
            shortUrl: data.shortUrl,
            createdAt: data.expiresAt,
        });
        renderHistory();
        urlInput.value = '';
    } catch (err) {
        showError(err.message || 'Error al crear la URL corta');
    } finally {
        setLoading(false);
    }
});

copyBtn.addEventListener('click', () => {
    copyToClipboard(shortUrlEl.textContent, copyBtn);
});

clearBtn.addEventListener('click', clearAllHistory);

infoClose.addEventListener('click', () => {
    infoSection.classList.add('hidden');
});

// ── Init ─────────────────────────────────────────────
renderHistory();
