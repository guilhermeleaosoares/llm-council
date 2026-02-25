// ── Council Consensus Engine ──
// Implements the voting + election mechanism when no King LLM is selected

import { callProvider } from './providers/unified.js';

const VOTE_PROMPT = (query) => `You are part of an AI council. Classify this user query and rate your confidence in handling it.

User query: "${query.slice(0, 500)}"

Reply ONLY with valid JSON, no markdown:
{"domain":"<one of: coding, creative_writing, data_analysis, math, research, general_knowledge, image_description, translation, other>","confidence":<1-10 integer>,"reason":"<one sentence>"}`;

export async function runConsensusVoting({ models, query }) {
    const startTime = Date.now();

    // Phase 1: Send lightweight voting prompt to all models
    const voteResults = await Promise.allSettled(
        models.map(async (model) => {
            try {
                const result = await callProvider({
                    apiKey: model.apiKey,
                    baseUrl: model.baseUrl,
                    modelSlug: model.modelSlug,
                    messages: [{ role: 'user', content: VOTE_PROMPT(query) }],
                    temperature: 0,
                });

                // Parse JSON vote
                const raw = result.content.trim();
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON in response');
                const vote = JSON.parse(jsonMatch[0]);

                return {
                    modelId: model.id,
                    domain: vote.domain || 'general_knowledge',
                    confidence: Math.min(10, Math.max(1, parseInt(vote.confidence) || 5)),
                    reason: vote.reason || '',
                    error: null,
                };
            } catch (err) {
                return {
                    modelId: model.id,
                    domain: 'general_knowledge',
                    confidence: 5,
                    reason: `Vote failed: ${err.message}`,
                    error: err.message,
                };
            }
        })
    );

    const votes = voteResults.map(r =>
        r.status === 'fulfilled' ? r.value : {
            modelId: 'unknown',
            domain: 'general_knowledge',
            confidence: 1,
            reason: 'Vote rejected',
            error: r.reason?.message,
        }
    );

    // Phase 2: Election — highest confidence wins
    const validVotes = votes.filter(v => !v.error);
    const sortedVotes = [...votes].sort((a, b) => b.confidence - a.confidence);
    const electedKingId = sortedVotes[0]?.modelId || models[0]?.id;

    // Determine consensus domain
    const domainCounts = {};
    for (const v of validVotes) {
        domainCounts[v.domain] = (domainCounts[v.domain] || 0) + 1;
    }
    const consensusDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general_knowledge';

    const latencyMs = Date.now() - startTime;
    const totalVoteTokens = votes.length * 80; // ~80 tokens per vote (rough estimate)

    return {
        electedKingId,
        consensusDomain,
        votes,
        latencyMs,
        estimatedTokens: totalVoteTokens,
    };
}
