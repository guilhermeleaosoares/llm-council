import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { callProvider, testProvider } from './providers/unified.js';
import { runConsensusVoting } from './consensus.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const app = express();
const PORT = 3001;

// Unique ID for this specific backend process run
const RUN_ID = Date.now().toString();

// ── Middleware ──
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '50mb' }));

// ── Rate limiting ──
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Rate limit exceeded. Please wait before sending more requests.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

const heavyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: 'Heavy operation rate limit. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Request validation ──
function validateChatRequest(req, res, next) {
    const { apiKey, messages } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
        return res.status(400).json({ error: 'Invalid or missing API key' });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
    }
    for (const msg of messages) {
        if (typeof msg.content === 'string' && msg.content.length > 1000000) {
            return res.status(400).json({ error: 'Message content too long (max 1,000,000 chars)' });
        }
    }
    next();
}

// ── Unified chat endpoint ──
app.post('/api/chat', validateChatRequest, async (req, res) => {
    try {
        const { apiKey, baseUrl, modelSlug, messages, systemPrompt, temperature = 0.7, images = [] } = req.body;
        const result = await callProvider({ apiKey, baseUrl, modelSlug, messages, systemPrompt, temperature, images });
        res.json(result);
    } catch (err) {
        console.error(`[chat] Error:`, err.message);
        res.status(err.status || 500).json({ error: err.message || 'Provider request failed' });
    }
});

// ── Image generation endpoint ──
app.post('/api/generate-image', heavyLimiter, async (req, res) => {
    const { apiKey, baseUrl, modelSlug, prompt, aspectRatio, quality } = req.body;
    if (!apiKey || !prompt) {
        return res.status(400).json({ error: 'API key and prompt required' });
    }
    try {
        const result = await callProvider({ apiKey, baseUrl, modelSlug, type: 'image', prompt, aspectRatio, quality });

        // Convert HTTP imageUrl to base64 for LLM vision memory
        if (result.imageUrl && result.imageUrl.startsWith('http') && !result.base64) {
            try {
                const imgRes = await fetch(result.imageUrl);
                if (imgRes.ok) {
                    const buffer = await imgRes.arrayBuffer();
                    result.base64 = Buffer.from(buffer).toString('base64');
                }
            } catch (e) {
                console.error('[Base64 Fetch] Failed to fetch generated image:', e.message);
            }
        } else if (result.imageUrl && result.imageUrl.startsWith('data:image/')) {
            // Extract base64 from data URI if provider already returned it inline
            const match = result.imageUrl.match(/^data:image\/[a-zA-Z0-9+-]+;base64,(.+)$/);
            if (match && match[1]) result.base64 = match[1];
        }

        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ── Video generation endpoint ──
app.post('/api/generate-video', heavyLimiter, async (req, res) => {
    const { apiKey, baseUrl, modelSlug, prompt, aspectRatio, quality, duration } = req.body;
    if (!apiKey || !prompt) {
        return res.status(400).json({ error: 'API key and prompt required' });
    }
    try {
        const result = await callProvider({ apiKey, baseUrl, modelSlug, type: 'video', prompt, aspectRatio, quality, duration });
        res.json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ── Web Search endpoint ──
app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query string required' });
    }
    try {
        const encoded = encodeURIComponent(query);
        const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
        });
        const html = await response.text();

        // Parse results from DuckDuckGo HTML
        const results = [];
        const resultPattern = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetPattern = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

        let match;
        while ((match = resultPattern.exec(html)) !== null && results.length < 8) {
            let href = match[1];
            // DuckDuckGo wraps URLs in a redirect — extract the actual URL
            const udParam = href.match(/uddg=([^&]+)/);
            if (udParam) href = decodeURIComponent(udParam[1]);

            const title = match[2].replace(/<[^>]+>/g, '').trim();
            results.push({ title, url: href, content: '' });
        }

        // Get snippets
        let snippetIdx = 0;
        while ((match = snippetPattern.exec(html)) !== null && snippetIdx < results.length) {
            results[snippetIdx].content = match[1].replace(/<[^>]+>/g, '').trim();
            snippetIdx++;
        }

        res.json({ results, query });
    } catch (err) {
        console.error('[search] Error:', err.message);
        res.status(500).json({ error: 'Search failed: ' + err.message, results: [] });
    }
});

// ── Deep Search endpoint (multi-query, 50+ results) ──
app.post('/api/deep-search', heavyLimiter, async (req, res) => {
    const { query, subQueries } = req.body;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query string required' });
    }

    try {
        // Generate search variations if not provided
        const queries = subQueries?.length > 0 ? subQueries : [
            query,
            `${query} latest research`,
            `${query} expert analysis`,
            `${query} pros cons`,
            `${query} examples use cases`,
            `${query} comparison alternatives`,
        ];

        const searchOne = async (q) => {
            try {
                const encoded = encodeURIComponent(q);
                const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                });
                const html = await response.text();

                const results = [];
                const resultPattern = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
                const snippetPattern = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

                let match;
                while ((match = resultPattern.exec(html)) !== null && results.length < 10) {
                    let href = match[1];
                    const udParam = href.match(/uddg=([^&]+)/);
                    if (udParam) href = decodeURIComponent(udParam[1]);
                    const title = match[2].replace(/<[^>]+>/g, '').trim();
                    results.push({ title, url: href, content: '', source: q });
                }

                let snippetIdx = 0;
                while ((match = snippetPattern.exec(html)) !== null && snippetIdx < results.length) {
                    results[snippetIdx].content = match[1].replace(/<[^>]+>/g, '').trim();
                    snippetIdx++;
                }

                return results;
            } catch (err) {
                console.error(`[deep-search] Sub-query failed: ${q}`, err.message);
                return [];
            }
        };

        // Run all queries in parallel
        const allResults = await Promise.all(queries.map(searchOne));
        const flat = allResults.flat();

        // Deduplicate by URL
        const seen = new Set();
        const deduped = [];
        for (const r of flat) {
            const normalized = r.url.replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '');
            if (!seen.has(normalized)) {
                seen.add(normalized);
                deduped.push(r);
            }
        }

        console.log(`[deep-search] ${queries.length} queries => ${flat.length} results => ${deduped.length} unique`);
        res.json({ results: deduped, queries, query });
    } catch (err) {
        console.error('[deep-search] Error:', err.message);
        res.status(500).json({ error: 'Deep search failed: ' + err.message, results: [], queries: [] });
    }
});

// ── Web Scrape endpoint ──
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL required' });
    }
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
        });
        const html = await response.text();

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : url;

        // Strip scripts, styles, and html tags for raw text extraction
        const text = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        res.json({ title, url, text });
    } catch (err) {
        console.error('[scrape] Error:', err.message);
        res.status(500).json({ error: 'Scrape failed: ' + err.message });
    }
});

// ── Test connection ──
app.post('/api/test', async (req, res) => {
    const { apiKey, baseUrl, modelSlug, type } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API key required' });
    try {
        const result = await testProvider({ apiKey, baseUrl, modelSlug, type });
        res.json(result);
    } catch (err) {
        console.error('[test] Error:', err.message);
        res.status(400).json({ success: false, error: err.message });
    }
});

// ── Council consensus voting ──
app.post('/api/consensus', heavyLimiter, async (req, res) => {
    const { models, query } = req.body;
    if (!models || !Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ error: 'Models array required for consensus' });
    }
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query string required' });
    }
    try {
        const result = await runConsensusVoting({ models, query });
        res.json(result);
    } catch (err) {
        console.error('[consensus] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Health ──
app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '4.0', runId: RUN_ID }));

// ── Notebook Persistence ──
const NOTEBOOKS_FILE = path.join(process.cwd(), 'data', 'notebooks.json');

app.get('/api/notebooks', (req, res) => {
    try {
        if (!fs.existsSync(NOTEBOOKS_FILE)) {
            return res.json([]);
        }
        const data = fs.readFileSync(NOTEBOOKS_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('[notebooks] GET Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notebooks', (req, res) => {
    try {
        const notebooks = req.body;
        if (!Array.isArray(notebooks)) {
            return res.status(400).json({ error: 'Expected an array of notebooks' });
        }
        if (!fs.existsSync(path.dirname(NOTEBOOKS_FILE))) {
            fs.mkdirSync(path.dirname(NOTEBOOKS_FILE), { recursive: true });
        }
        fs.writeFileSync(NOTEBOOKS_FILE, JSON.stringify(notebooks, null, 2), 'utf-8');
        res.json({ success: true });
    } catch (err) {
        console.error('[notebooks] POST Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Local File Export (Downloads Folder) ──
app.post('/api/export-config', (req, res) => {
    try {
        const config = req.body;
        const downloadsDir = path.join(os.homedir(), 'Downloads');
        const filePath = path.join(downloadsDir, 'llm-council-config.json');

        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
        res.json({ success: true, path: filePath });
    } catch (err) {
        console.error('[export-config] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`LLM Council backend v4 running on http://localhost:${PORT}`);
});
