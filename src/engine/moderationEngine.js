import { MODEL_CATALOG } from '../data/modelConfig';

const SIMULATED_RESPONSES = {
    'gemini-pro': {
        style: 'thorough and structured',
        prefix: 'Based on comprehensive analysis',
    },
    'claude-opus': {
        style: 'nuanced and thoughtful',
        prefix: 'After careful consideration',
    },
    'gpt-5': {
        style: 'clear and well-organized',
        prefix: 'Here\'s a clear breakdown',
    },
    'grok-3': {
        style: 'direct and insightful',
        prefix: 'Let me cut straight to it',
    },
    'deepseek-r1': {
        style: 'technical and precise',
        prefix: 'Through systematic reasoning',
    },
    'kimi': {
        style: 'detailed with context',
        prefix: 'Considering multiple perspectives',
    },
    'llama-4': {
        style: 'balanced and practical',
        prefix: 'From a practical standpoint',
    },
};

function generateModelResponse(modelId, query) {
    const sim = SIMULATED_RESPONSES[modelId] || { style: 'helpful', prefix: 'Here is my response' };
    const confidence = 0.7 + Math.random() * 0.28;
    const votes = ['agree', 'agree', 'agree', 'partial', 'disagree'];
    const vote = votes[Math.floor(Math.random() * votes.length)];

    const responses = [
        `${sim.prefix}, this is an important topic. The key consideration here is understanding the fundamental principles at work. I'd recommend approaching this systematically by first identifying the core requirements, then evaluating the available options against those criteria.`,
        `${sim.prefix}, there are several angles to consider. The most effective approach would involve breaking this down into manageable components. Each component should be evaluated on its own merits while keeping the bigger picture in mind.`,
        `${sim.prefix}, I've analyzed this from multiple perspectives. The evidence suggests that a balanced approach works best here. Start with the essentials, iterate based on feedback, and refine as you gather more information.`,
    ];

    return {
        modelId,
        text: responses[Math.floor(Math.random() * responses.length)],
        confidence: Math.round(confidence * 100) / 100,
        vote,
        reasoning: `Applied ${sim.style} analysis to evaluate the query across ${2 + Math.floor(Math.random() * 4)} dimensions.`,
    };
}

export function runCouncil(query, enabledModels, modelConfigs) {
    const responses = enabledModels.map(m => generateModelResponse(m.id, query));

    // Apply tier weights
    const weighted = responses.map(r => {
        const config = modelConfigs.find(mc => mc.id === r.modelId);
        const tierWeight = config?.tier === 1 ? 1.5 : config?.tier === 2 ? 1.0 : 0.7;
        const modelWeight = (config?.weight || 50) / 100;
        return { ...r, effectiveWeight: tierWeight * modelWeight * r.confidence };
    });

    // Sort by effective weight
    weighted.sort((a, b) => b.effectiveWeight - a.effectiveWeight);

    // Count agreements
    const agreeCount = weighted.filter(r => r.vote === 'agree').length;
    const partialCount = weighted.filter(r => r.vote === 'partial').length;
    const total = weighted.length;

    // Build moderation summary
    const topModel = MODEL_CATALOG.find(m => m.id === weighted[0]?.modelId);
    const moderationText = `**Council Verdict:** ${agreeCount}/${total} models agree on the core approach. ` +
        (partialCount > 0 ? `${partialCount} model(s) partially agree with nuanced differences. ` : '') +
        `Highest weighted response from **${topModel?.name}** (Tier ${modelConfigs.find(mc => mc.id === topModel?.id)?.tier || 1}). ` +
        `Consensus confidence: ${Math.round(weighted.reduce((s, r) => s + r.confidence, 0) / total * 100)}%.`;

    // Synthesized best answer
    const bestResponse = weighted[0];
    const synthesis = `${bestResponse.text}\n\nThis answer was synthesized by the LLM Council, weighing inputs from ${total} models. The council reached ${agreeCount > total / 2 ? 'strong' : 'moderate'} consensus on this approach, with the highest confidence from ${topModel?.name}.`;

    return {
        synthesis,
        moderationText,
        responses: weighted,
    };
}
