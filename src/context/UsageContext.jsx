import { createContext, useContext, useState, useCallback } from 'react';

const UsageContext = createContext();

// ── Pricing table (USD per 1M tokens) ──
// Matched against model slug (case-insensitive). First match wins.
export const PRICING_TABLE = [
    // OpenAI
    { match: /gpt-4\.1(?!-mini|-nano)/, provider: 'OpenAI', label: 'GPT-4.1', in: 2.0, out: 8.0 },
    { match: /gpt-4\.1-mini/, provider: 'OpenAI', label: 'GPT-4.1 mini', in: 0.4, out: 1.6 },
    { match: /gpt-4\.1-nano/, provider: 'OpenAI', label: 'GPT-4.1 nano', in: 0.1, out: 0.4 },
    { match: /gpt-4o(?!-mini)/, provider: 'OpenAI', label: 'GPT-4o', in: 2.5, out: 10.0 },
    { match: /gpt-4o-mini/, provider: 'OpenAI', label: 'GPT-4o mini', in: 0.15, out: 0.6 },
    { match: /o3(?!-mini|-pro)/, provider: 'OpenAI', label: 'o3', in: 10.0, out: 40.0 },
    { match: /o3-mini/, provider: 'OpenAI', label: 'o3-mini', in: 1.1, out: 4.4 },
    { match: /o3-pro/, provider: 'OpenAI', label: 'o3-pro', in: 20.0, out: 80.0 },
    { match: /o4-mini/, provider: 'OpenAI', label: 'o4-mini', in: 1.1, out: 4.4 },
    { match: /o1(?!-mini|-pro)/, provider: 'OpenAI', label: 'o1', in: 15.0, out: 60.0 },
    { match: /o1-mini/, provider: 'OpenAI', label: 'o1-mini', in: 1.1, out: 4.4 },
    // Anthropic
    { match: /claude-opus-4/, provider: 'Anthropic', label: 'Claude Opus 4', in: 15.0, out: 75.0 },
    { match: /claude-sonnet-4/, provider: 'Anthropic', label: 'Claude Sonnet 4', in: 3.0, out: 15.0 },
    { match: /claude-haiku-4/, provider: 'Anthropic', label: 'Claude Haiku 4', in: 0.8, out: 4.0 },
    { match: /claude-3-5-sonnet/, provider: 'Anthropic', label: 'Claude 3.5 Sonnet', in: 3.0, out: 15.0 },
    { match: /claude-3-5-haiku/, provider: 'Anthropic', label: 'Claude 3.5 Haiku', in: 0.8, out: 4.0 },
    { match: /claude-3-opus/, provider: 'Anthropic', label: 'Claude 3 Opus', in: 15.0, out: 75.0 },
    // Google
    { match: /gemini-2\.5-pro/, provider: 'Google', label: 'Gemini 2.5 Pro', in: 1.25, out: 10.0 },
    { match: /gemini-2\.0-flash(?!-lite)/, provider: 'Google', label: 'Gemini 2.0 Flash', in: 0.1, out: 0.4 },
    { match: /gemini-2\.0-flash-lite/, provider: 'Google', label: 'Gemini 2.0 Flash-Lite', in: 0.075, out: 0.3 },
    { match: /gemini-1\.5-pro/, provider: 'Google', label: 'Gemini 1.5 Pro', in: 1.25, out: 5.0 },
    { match: /gemini-1\.5-flash/, provider: 'Google', label: 'Gemini 1.5 Flash', in: 0.075, out: 0.3 },
    // xAI
    { match: /grok-3(?!-mini|-fast)/, provider: 'xAI', label: 'Grok 3', in: 3.0, out: 15.0 },
    { match: /grok-3-mini/, provider: 'xAI', label: 'Grok 3 Mini', in: 0.3, out: 0.5 },
    { match: /grok-3-fast/, provider: 'xAI', label: 'Grok 3 Fast', in: 5.0, out: 25.0 },
    { match: /grok-2/, provider: 'xAI', label: 'Grok 2', in: 2.0, out: 10.0 },
    { match: /grok-beta/, provider: 'xAI', label: 'Grok Beta', in: 5.0, out: 15.0 },
    // DeepSeek
    { match: /deepseek-v3/, provider: 'DeepSeek', label: 'DeepSeek V3', in: 0.27, out: 1.1 },
    { match: /deepseek-r1(?!-zero)/, provider: 'DeepSeek', label: 'DeepSeek R1', in: 0.55, out: 2.19 },
    { match: /deepseek-chat/, provider: 'DeepSeek', label: 'DeepSeek Chat', in: 0.27, out: 1.1 },
    // Groq
    { match: /llama-3\.3-70b/, provider: 'Groq', label: 'Llama 3.3 70B', in: 0.59, out: 0.79 },
    { match: /llama-3\.1-70b/, provider: 'Groq', label: 'Llama 3.1 70B', in: 0.59, out: 0.79 },
    { match: /llama-3\.1-8b/, provider: 'Groq', label: 'Llama 3.1 8B', in: 0.05, out: 0.08 },
    { match: /mixtral-8x7b/, provider: 'Groq', label: 'Mixtral 8x7B', in: 0.24, out: 0.24 },
    // Together AI
    { match: /llama-3\.1-405b/, provider: 'Together AI', label: 'Llama 3.1 405B', in: 3.5, out: 3.5 },
    // Cohere
    { match: /command-r-plus/, provider: 'Cohere', label: 'Command R+', in: 2.5, out: 10.0 },
    { match: /command-r(?!-plus)/, provider: 'Cohere', label: 'Command R', in: 0.15, out: 0.6 },
    // OpenRouter (pass-through — pricing varies; use 0 as sentinel)
    { match: /openrouter/, provider: 'OpenRouter', label: 'OpenRouter', in: 0, out: 0 },
];

export function getPricing(slug = '', name = '') {
    // Try slug first, then model name — catches cases where slug is blank or non-standard
    for (const candidate of [slug, name].filter(Boolean)) {
        const s = candidate.toLowerCase();
        for (const entry of PRICING_TABLE) {
            if (entry.match.test(s)) return entry;
        }
    }
    return null;
}

export function detectProvider(baseUrl = '') {
    const u = (baseUrl || '').toLowerCase();
    if (!u || u.includes('api.openai.com')) return 'OpenAI';
    if (u.includes('api.anthropic.com')) return 'Anthropic';
    if (u.includes('generativelanguage.googleapis.com')) return 'Google';
    if (u.includes('api.x.ai') || u.includes('x.ai')) return 'xAI';
    if (u.includes('api.deepseek.com')) return 'DeepSeek';
    if (u.includes('api.groq.com')) return 'Groq';
    if (u.includes('openrouter.ai')) return 'OpenRouter';
    if (u.includes('together.ai')) return 'Together AI';
    if (u.includes('api.cohere.com')) return 'Cohere';
    if (u.includes('api.kie.ai')) return 'Kie AI';
    return 'Custom';
}

export function estimateCost(slug, inputTokens, outputTokens, name = '') {
    const pricing = getPricing(slug, name);
    if (!pricing || pricing.in === 0) return null; // unknown pricing
    return (inputTokens / 1_000_000) * pricing.in + (outputTokens / 1_000_000) * pricing.out;
}

const STORAGE_KEY = 'llm-council-usage';
const MAX_LOG_SIZE = 5000; // keep last 5000 events

function loadLog() {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        const parsed = s ? JSON.parse(s) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function saveLog(log) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch { /* storage full – skip */ }
}

export function UsageProvider({ children }) {
    const [usageLog, setUsageLog] = useState(loadLog);

    const logUsage = useCallback((event) => {
        setUsageLog(prev => {
            const next = [{ ...event, id: Date.now().toString() + Math.random() }, ...prev].slice(0, MAX_LOG_SIZE);
            saveLog(next);
            return next;
        });
    }, []);

    const clearUsage = useCallback(() => {
        setUsageLog([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return (
        <UsageContext.Provider value={{ usageLog, logUsage, clearUsage }}>
            {children}
        </UsageContext.Provider>
    );
}

const FALLBACK = { usageLog: [], logUsage: () => {}, clearUsage: () => {} };

export function useUsage() {
    const ctx = useContext(UsageContext);
    return ctx || FALLBACK;
}
