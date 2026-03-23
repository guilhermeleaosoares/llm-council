const PRICING_TABLE = [
    { match: /gpt-4\.1/, provider: 'OpenAI', label: 'GPT-4.1', in: 2.0, out: 8.0 },
    { match: /gemini-2\.5-pro/, provider: 'Google', label: 'Gemini 2.5 Pro', in: 1.25, out: 10.0 }
];

function getPricing(slug = '', name = '') {
    for (const candidate of [slug, name].filter(Boolean)) {
        const s = candidate.toLowerCase();
        for (const entry of PRICING_TABLE) {
            if (entry.match.test(s)) return entry;
        }
    }
    return null;
}

function estimateCost(slug, inputTokens, outputTokens, name = '') {
    const pricing = getPricing(slug, name);
    if (!pricing || pricing.in === 0) return null;
    return (inputTokens / 1_000_000) * pricing.in + (outputTokens / 1_000_000) * pricing.out;
}

const req = {
    timestamp: new Date().toISOString(),
    modelId: '123',
    modelName: 'GPT-4.1',
    modelSlug: 'gpt-4.1',
    provider: 'OpenAI',
    inputTokens: 0,
    outputTokens: 0,
    requestType: 'chat'
};
req.estimatedCost = estimateCost(req.modelSlug, req.inputTokens, req.outputTokens, req.modelName);

const usageLog = [req];

let totalInput = 0, totalOutput = 0, totalCost = 0, knownCost = 0;
const byDay = {};

for (const e of usageLog) {
    totalInput += e.inputTokens || 0;
    totalOutput += e.outputTokens || 0;
    if (e.estimatedCost !== null && e.estimatedCost !== undefined) {
        totalCost += e.estimatedCost;
        knownCost++;
    }
    const day = e.timestamp?.slice(0, 10) || 'unknown';
    if (!byDay[day]) byDay[day] = { tokens: 0, cost: 0, calls: 0 };
    byDay[day].tokens += (e.inputTokens || 0) + (e.outputTokens || 0);
    byDay[day].cost += e.estimatedCost || 0;
    byDay[day].calls++;
}

const today = new Date();
const dayChart = [];
for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dayChart.push({ label, tokens: byDay[key]?.tokens || 0, cost: byDay[key]?.cost || 0, calls: byDay[key]?.calls || 0 });
}

console.log("Stats:", { totalInput, totalOutput, totalCost, knownCost });
console.log("DayChart calls today:", dayChart[13].calls);

