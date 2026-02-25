// ── Model Catalog ──
// Preset model suggestions for the "Add Model" dropdown. Users can also enter custom models.
// No models are auto-loaded — the user must add each one with their own API key.
// Last updated: Feb 2026

export const MODEL_CATALOG = [
    // ═══════════════════════════════════════
    //  TEXT / LLM — Direct Provider APIs
    // ═══════════════════════════════════════

    // ── Google DeepMind ──
    { name: 'Gemini 3 Pro', provider: 'Google DeepMind', slug: 'gemini-3-pro-preview', baseUrl: 'https://generativelanguage.googleapis.com', type: 'text', color: '#4285F4', abbrev: 'G', capabilities: ['Code', 'Reasoning', 'Vision', 'Long Context'] },
    { name: 'Gemini 3 Flash', provider: 'Google DeepMind', slug: 'gemini-3-flash-preview', baseUrl: 'https://generativelanguage.googleapis.com', type: 'text', color: '#4285F4', abbrev: 'G', capabilities: ['Speed', 'Vision', 'Code'] },
    { name: 'Gemini 3 Flash-8B', provider: 'Google DeepMind', slug: 'gemini-3-flash-8b-preview', baseUrl: 'https://generativelanguage.googleapis.com', type: 'text', color: '#4285F4', abbrev: 'G', capabilities: ['Ultra Speed', 'Code'] },

    // ── Anthropic ──
    { name: 'Claude Sonnet 4', provider: 'Anthropic', slug: 'claude-sonnet-4-20250514', baseUrl: 'https://api.anthropic.com', type: 'text', color: '#d97706', abbrev: 'C', capabilities: ['Code', 'Analysis', 'Writing', 'Vision'] },
    { name: 'Claude Opus 4', provider: 'Anthropic', slug: 'claude-opus-4-20250514', baseUrl: 'https://api.anthropic.com', type: 'text', color: '#d97706', abbrev: 'C', capabilities: ['Code', 'Analysis', 'Writing', 'Vision'] },
    { name: 'Claude Haiku 3.5', provider: 'Anthropic', slug: 'claude-3-5-haiku-20241022', baseUrl: 'https://api.anthropic.com', type: 'text', color: '#d97706', abbrev: 'C', capabilities: ['Speed', 'Code', 'Analysis'] },

    // ── Kie AI ──
    { name: 'Gemini 3 Pro (Kie)', provider: 'Kie AI', slug: 'gemini-3-pro', baseUrl: 'https://api.kie.ai', type: 'text', color: '#8b5cf6', abbrev: 'K', capabilities: ['Writing', 'Reasoning', 'Vision'] },
    { name: 'Gemini 3 Flash (Kie)', provider: 'Kie AI', slug: 'gemini-3-flash', baseUrl: 'https://api.kie.ai', type: 'text', color: '#8b5cf6', abbrev: 'K', capabilities: ['Speed', 'Vision'] },

    // ── OpenAI ──
    { name: 'GPT-4o', provider: 'OpenAI', slug: 'gpt-4o', baseUrl: 'https://api.openai.com', type: 'text', color: '#10a37f', abbrev: 'O', capabilities: ['Code', 'Vision', 'Reasoning', 'Creativity'] },
    { name: 'GPT-4o Mini', provider: 'OpenAI', slug: 'gpt-4o-mini', baseUrl: 'https://api.openai.com', type: 'text', color: '#10a37f', abbrev: 'O', capabilities: ['Speed', 'Code', 'Vision'] },
    { name: 'o3', provider: 'OpenAI', slug: 'o3', baseUrl: 'https://api.openai.com', type: 'text', color: '#10a37f', abbrev: 'O', capabilities: ['Reasoning', 'Code', 'Math'] },
    { name: 'o3-mini', provider: 'OpenAI', slug: 'o3-mini', baseUrl: 'https://api.openai.com', type: 'text', color: '#10a37f', abbrev: 'O', capabilities: ['Speed', 'Reasoning', 'Math'] },
    { name: 'o4-mini', provider: 'OpenAI', slug: 'o4-mini', baseUrl: 'https://api.openai.com', type: 'text', color: '#10a37f', abbrev: 'O', capabilities: ['Reasoning', 'Code', 'Speed'] },

    // ── xAI ──
    { name: 'Grok 3', provider: 'xAI', slug: 'grok-3-latest', baseUrl: 'https://api.x.ai', type: 'text', color: '#1DA1F2', abbrev: 'X', capabilities: ['Reasoning', 'Real-time', 'Code'] },
    { name: 'Grok 3 Mini', provider: 'xAI', slug: 'grok-3-mini-latest', baseUrl: 'https://api.x.ai', type: 'text', color: '#1DA1F2', abbrev: 'X', capabilities: ['Speed', 'Reasoning', 'Code'] },

    // ── DeepSeek ──
    { name: 'DeepSeek R1', provider: 'DeepSeek', slug: 'deepseek-reasoner', baseUrl: 'https://api.deepseek.com', type: 'text', color: '#7c3aed', abbrev: 'D', capabilities: ['Code', 'Math', 'Reasoning'] },
    { name: 'DeepSeek V3', provider: 'DeepSeek', slug: 'deepseek-chat', baseUrl: 'https://api.deepseek.com', type: 'text', color: '#7c3aed', abbrev: 'D', capabilities: ['Code', 'Chat', 'Reasoning'] },

    // ── Mistral ──
    { name: 'Mistral Large', provider: 'Mistral AI', slug: 'mistral-large-latest', baseUrl: 'https://api.mistral.ai', type: 'text', color: '#ff7000', abbrev: 'M', capabilities: ['Multilingual', 'Code', 'Reasoning'] },
    { name: 'Mistral Small', provider: 'Mistral AI', slug: 'mistral-small-latest', baseUrl: 'https://api.mistral.ai', type: 'text', color: '#ff7000', abbrev: 'M', capabilities: ['Speed', 'Multilingual', 'Code'] },
    { name: 'Pixtral Large', provider: 'Mistral AI', slug: 'pixtral-large-latest', baseUrl: 'https://api.mistral.ai', type: 'text', color: '#ff7000', abbrev: 'M', capabilities: ['Vision', 'Reasoning', 'Multilingual'] },

    // ── Qwen (via Together) ──
    { name: 'Qwen 3 235B', provider: 'Qwen (via Together)', slug: 'Qwen/Qwen3-235B-A22B-fp8', baseUrl: 'https://api.together.xyz', type: 'text', color: '#06b6d4', abbrev: 'Q', capabilities: ['Multilingual', 'Reasoning', 'Code'] },
    { name: 'Qwen 3 30B', provider: 'Qwen (via Together)', slug: 'Qwen/Qwen3-30B-A3B', baseUrl: 'https://api.together.xyz', type: 'text', color: '#06b6d4', abbrev: 'Q', capabilities: ['Speed', 'Multilingual', 'Code'] },

    // ── Google DeepMind (Free via AI Studio) ──
    { name: 'Gemma 3 27B', provider: 'Google DeepMind', slug: 'gemma-3-27b-it', baseUrl: 'https://generativelanguage.googleapis.com', type: 'text', color: '#4285F4', abbrev: 'Gm', capabilities: ['Open Source', 'Multilingual', 'Vision'] },

    // ── Meta (via Together) ──
    { name: 'Llama 4 Maverick', provider: 'Meta (via Together)', slug: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', baseUrl: 'https://api.together.xyz', type: 'text', color: '#3b82f6', abbrev: 'L', capabilities: ['Code', 'Open Source', 'Reasoning'] },
    { name: 'Llama 4 Scout', provider: 'Meta (via Together)', slug: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', baseUrl: 'https://api.together.xyz', type: 'text', color: '#3b82f6', abbrev: 'L', capabilities: ['Speed', 'Open Source', 'Multilingual'] },
    { name: 'Llama 3.3 70B', provider: 'Meta (via Together)', slug: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', baseUrl: 'https://api.together.xyz', type: 'text', color: '#3b82f6', abbrev: 'L', capabilities: ['Code', 'Open Source', 'Speed'] },

    // ── Microsoft (via Together) ──
    { name: 'Phi-4', provider: 'Microsoft (via Together)', slug: 'microsoft/phi-4', baseUrl: 'https://api.together.xyz', type: 'text', color: '#00bcf2', abbrev: 'Φ', capabilities: ['Reasoning', 'Open Source', 'Math'] },

    // ── NVIDIA (via Together) ──
    { name: 'Nemotron Ultra', provider: 'NVIDIA (via Together)', slug: 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF', baseUrl: 'https://api.together.xyz', type: 'text', color: '#76b900', abbrev: 'N', capabilities: ['Reasoning', 'Code', 'Open Source'] },

    // ── Cohere ──
    { name: 'Command R+', provider: 'Cohere', slug: 'command-r-plus', baseUrl: 'https://api.cohere.com', type: 'text', color: '#39594d', abbrev: 'Co', capabilities: ['RAG', 'Multilingual', 'Open Source'] },
    { name: 'Command A', provider: 'Cohere', slug: 'command-a-03-2025', baseUrl: 'https://api.cohere.com', type: 'text', color: '#39594d', abbrev: 'Co', capabilities: ['Speed', 'Code', 'Multilingual'] },

    // ── Groq (ultra-fast inference) ──
    { name: 'Groq: Llama 4 Scout', provider: 'Groq', slug: 'meta-llama/llama-4-scout-17b-16e-instruct', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Vision', 'Open Source'] },
    { name: 'Groq: Llama 4 Maverick', provider: 'Groq', slug: 'meta-llama/llama-4-maverick-17b-128e-instruct', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Reasoning', 'Vision'] },
    { name: 'Groq: Llama 3.3 70B', provider: 'Groq', slug: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Code', 'Open Source'] },
    { name: 'Groq: QwQ 32B', provider: 'Groq', slug: 'qwen-qwq-32b', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Reasoning', 'Math'] },
    { name: 'Groq: Llama 3.1 70B (Preview)', provider: 'Groq', slug: 'llama-3.1-70b-versatile', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Reasoning', 'Code'] },
    { name: 'Groq: Gemma 2 9B', provider: 'Groq', slug: 'gemma2-9b-it', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Open Source', 'Lightweight'] },
    { name: 'Groq: Llama 3.1 8B', provider: 'Groq', slug: 'llama-3.1-8b-instant', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Ultra Speed', 'Open Source', 'Lightweight'] },
    { name: 'Groq: Mixtral 8x7B', provider: 'Groq', slug: 'mixtral-8x7b-32768', baseUrl: 'https://api.groq.com/openai', type: 'text', color: '#f55036', abbrev: 'Gq', capabilities: ['Speed', 'Open Source'] },

    // ── HuggingFace Inference ──
    { name: 'HF: Qwen 2.5 72B', provider: 'HuggingFace', slug: 'Qwen/Qwen2.5-72B-Instruct', baseUrl: 'https://router.huggingface.co', type: 'text', color: '#ffbd45', abbrev: 'HF', capabilities: ['Open Source', 'Multilingual', 'Code'] },
    { name: 'HF: Qwen 2.5 Coder 32B', provider: 'HuggingFace', slug: 'Qwen/Qwen2.5-Coder-32B-Instruct', baseUrl: 'https://router.huggingface.co', type: 'text', color: '#ffbd45', abbrev: 'HF', capabilities: ['Code', 'Open Source', 'Speed'] },
    { name: 'HF: Llama 3.1 70B', provider: 'HuggingFace', slug: 'meta-llama/Llama-3.1-70B-Instruct', baseUrl: 'https://router.huggingface.co', type: 'text', color: '#ffbd45', abbrev: 'HF', capabilities: ['Open Source', 'Multilingual', 'Code'] },
    { name: 'HF: Mistral Nemo 12B', provider: 'HuggingFace', slug: 'mistralai/Mistral-Nemo-Instruct-2407', baseUrl: 'https://router.huggingface.co', type: 'text', color: '#ffbd45', abbrev: 'HF', capabilities: ['Open Source', 'Multilingual', 'Speed'] },
    { name: 'HF: Phi-3.5 Mini', provider: 'HuggingFace', slug: 'microsoft/Phi-3.5-mini-instruct', baseUrl: 'https://router.huggingface.co', type: 'text', color: '#ffbd45', abbrev: 'HF', capabilities: ['Lightweight', 'Open Source', 'Speed'] },
    { name: 'HF: FLUX.1 Schnell', provider: 'HuggingFace', slug: 'black-forest-labs/FLUX.1-schnell', baseUrl: 'https://router.huggingface.co', type: 'image', color: '#ffbd45', abbrev: 'HF', capabilities: ['Image Generation', 'Open Source', 'Speed'] },
    { name: 'HF: FLUX.1 Dev', provider: 'HuggingFace', slug: 'black-forest-labs/FLUX.1-dev', baseUrl: 'https://router.huggingface.co', type: 'image', color: '#ffbd45', abbrev: 'HF', capabilities: ['Image Generation', 'Open Source', 'Quality'] },
    { name: 'HF: Stable Diffusion XL', provider: 'HuggingFace', slug: 'stabilityai/stable-diffusion-xl-base-1.0', baseUrl: 'https://router.huggingface.co', type: 'image', color: '#ffbd45', abbrev: 'HF', capabilities: ['Image Generation', 'Open Source'] },
    { name: 'HF: Wan2.1 Video', provider: 'HuggingFace', slug: 'Wan-AI/Wan2.1-T2V-14B', baseUrl: 'https://router.huggingface.co', type: 'video', color: '#ffbd45', abbrev: 'HF', capabilities: ['Video Generation', 'Open Source'] },

    // ═══════════════════════════════════════
    //  AGGREGATORS — Top / Auto
    // ═══════════════════════════════════════

    // ── OpenRouter ──
    { name: 'OpenRouter Auto', provider: 'OpenRouter', slug: 'openrouter/auto', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Aggregate', 'Auto-select'] },
    { name: 'OpenRouter Free', provider: 'OpenRouter', slug: 'openrouter/free', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Free', 'Auto-select'] },
    { name: 'OpenRouter: Claude Sonnet 4', provider: 'OpenRouter', slug: 'anthropic/claude-sonnet-4', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Code', 'Analysis'] },
    { name: 'OpenRouter: GPT-4o', provider: 'OpenRouter', slug: 'openai/gpt-4o', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Code', 'Vision'] },
    { name: 'OpenRouter: Gemini 3 Pro', provider: 'OpenRouter', slug: 'google/gemini-3-pro-preview', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Reasoning', 'Code'] },
    { name: 'OpenRouter: Llama 4 Maverick', provider: 'OpenRouter', slug: 'meta-llama/llama-4-maverick-17b-128e-instruct', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Free', 'Open Source'] },
    { name: 'OpenRouter: Qwen 3 235B', provider: 'OpenRouter', slug: 'qwen/qwen3-235b-a22b', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Free', 'Reasoning'] },
    { name: 'OpenRouter: DeepSeek R1 (Free)', provider: 'OpenRouter', slug: 'deepseek/deepseek-r1:free', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Free', 'Reasoning', 'Math'] },
    { name: 'OpenRouter: Llama 3.3 70B (Free)', provider: 'OpenRouter', slug: 'meta-llama/llama-3.3-70b-instruct:free', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Free', 'Open Source'] },
    { name: 'OpenRouter: Mistral Nemo (Free)', provider: 'OpenRouter', slug: 'mistralai/mistral-nemo:free', baseUrl: 'https://openrouter.ai/api', type: 'text', color: '#6366f1', abbrev: 'R', capabilities: ['Free', 'Speed'] },

    // ── AIMLAPI (400+ models, free tier) ──
    { name: 'AIMLAPI: GPT-4o', provider: 'AIMLAPI', slug: 'gpt-4o', baseUrl: 'https://api.aimlapi.com', type: 'text', color: '#0ea5e9', abbrev: 'AI', capabilities: ['Aggregate', 'Vision'] },
    { name: 'AIMLAPI: Claude Sonnet 4', provider: 'AIMLAPI', slug: 'claude-sonnet-4-20250514', baseUrl: 'https://api.aimlapi.com', type: 'text', color: '#0ea5e9', abbrev: 'AI', capabilities: ['Aggregate', 'Code'] },
    { name: 'AIMLAPI: Llama 3.3 70B', provider: 'AIMLAPI', slug: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', baseUrl: 'https://api.aimlapi.com', type: 'text', color: '#0ea5e9', abbrev: 'AI', capabilities: ['Free', 'Open Source'] },
    { name: 'AIMLAPI: Qwen 2.5 72B', provider: 'AIMLAPI', slug: 'qwen/Qwen2.5-72B-Instruct', baseUrl: 'https://api.aimlapi.com', type: 'text', color: '#0ea5e9', abbrev: 'AI', capabilities: ['Open Source'] },
    { name: 'AIMLAPI: FLUX.1 Pro', provider: 'AIMLAPI', slug: 'flux-pro', baseUrl: 'https://api.aimlapi.com', type: 'image', color: '#0ea5e9', abbrev: 'AI', capabilities: ['Image Generation', 'Aggregate'] },

    // ═══════════════════════════════════════
    //  IMAGE GENERATION
    // ═══════════════════════════════════════

    { name: 'GPT Image 1', provider: 'OpenAI', slug: 'gpt-image-1', baseUrl: 'https://api.openai.com', type: 'image', color: '#10a37f', abbrev: 'GI', capabilities: ['Image Generation', 'Editing'] },
    { name: 'DALL-E 3', provider: 'OpenAI', slug: 'dall-e-3', baseUrl: 'https://api.openai.com', type: 'image', color: '#10a37f', abbrev: 'D3', capabilities: ['Image Generation'] },
    { name: 'Grok Image', provider: 'xAI', slug: 'grok-2-image-1212', baseUrl: 'https://api.x.ai', type: 'image', color: '#1DA1F2', abbrev: 'XI', capabilities: ['Image Generation'] },
    { name: 'Imagen 3', provider: 'Google DeepMind', slug: 'imagen-3.0-generate-002', baseUrl: 'https://generativelanguage.googleapis.com', type: 'image', color: '#4285F4', abbrev: 'IG', capabilities: ['Image Generation'] },
    { name: 'FLUX 2 Pro', provider: 'BFL (via fal.ai)', slug: 'fal-ai/flux-pro/v2', baseUrl: 'https://fal.run', type: 'image', color: '#a855f7', abbrev: 'FX', capabilities: ['Image Generation', 'Photorealism'] },
    { name: 'FLUX 1.1 Pro', provider: 'BFL (via fal.ai)', slug: 'fal-ai/flux-pro/v1.1', baseUrl: 'https://fal.run', type: 'image', color: '#a855f7', abbrev: 'FX', capabilities: ['Image Generation', 'Speed'] },
    { name: 'Stable Diffusion 3.5', provider: 'Stability AI', slug: 'sd3.5-large', baseUrl: 'https://api.stability.ai', type: 'image', color: '#a855f7', abbrev: 'SD', capabilities: ['Image Generation'] },
    { name: 'Nano Banana Pro', provider: 'Google DeepMind', slug: 'gemini-3-pro-image-preview', baseUrl: 'https://generativelanguage.googleapis.com', type: 'image', color: '#f59e0b', abbrev: 'NB', capabilities: ['Image Generation', 'Editing'] },

    // ── Kie AI Image Models ──
    { name: 'Nano Banana', provider: 'Kie AI', slug: 'google/nano-banana', baseUrl: 'https://api.kie.ai', type: 'image', color: '#8b5cf6', abbrev: 'NB', capabilities: ['Fast'] },
    { name: 'Grok Imagine', provider: 'Kie AI', slug: 'grok-imagine/text-to-image', baseUrl: 'https://api.kie.ai', type: 'image', color: '#8b5cf6', abbrev: 'GI', capabilities: ['Creative'] },
    { name: 'Seedream 4.5', provider: 'Kie AI', slug: 'bytedance/seedream', baseUrl: 'https://api.kie.ai', type: 'image', color: '#8b5cf6', abbrev: 'SD', capabilities: ['High Fidelity'] },

    // ═══════════════════════════════════════
    //  VIDEO GENERATION
    // ═══════════════════════════════════════
    { name: 'Sora', provider: 'OpenAI', slug: 'sora', baseUrl: 'https://api.openai.com', type: 'video', color: '#10a37f', abbrev: 'S', capabilities: ['Video Generation', 'High Fidelity'] },
    { name: 'Veo 2.0', provider: 'Google DeepMind', slug: 'veo-2.0-preview', baseUrl: 'https://generativelanguage.googleapis.com', type: 'video', color: '#4285F4', abbrev: 'V', capabilities: ['Video Generation', 'Cinematic'] },
    { name: 'Runway Gen-3 Alpha', provider: 'Runway', slug: 'gen-3-alpha', baseUrl: 'https://api.runwayml.com', type: 'video', color: '#facc15', abbrev: 'R', capabilities: ['Video Generation', 'Stylized'] },
    { name: 'Luma Dream Machine', provider: 'Luma AI', slug: 'dream-machine', baseUrl: 'https://api.lumalabs.ai', type: 'video', color: '#ec4899', abbrev: 'L', capabilities: ['Video Generation', 'Fast'] },

    // ── Kie AI Video Models ──
    { name: 'Kling 2.1 Pro', provider: 'Kie AI', slug: 'kling/v2-1-pro', baseUrl: 'https://api.kie.ai', type: 'video', color: '#ec4899', abbrev: 'KL', capabilities: ['Cinematic'] },
    { name: 'Grok Imagine Video', provider: 'Kie AI', slug: 'grok-imagine/text-to-video', baseUrl: 'https://api.kie.ai', type: 'video', color: '#ec4899', abbrev: 'GV', capabilities: ['Creative'] },
    { name: 'Veo 3', provider: 'Google DeepMind', slug: 'veo-3.0-generate-preview', baseUrl: 'https://generativelanguage.googleapis.com', type: 'video', color: '#4285F4', abbrev: 'V3', capabilities: ['Video Generation', 'Audio'] },
    { name: 'Veo 2', provider: 'Google DeepMind', slug: 'veo-2.0-generate-001', baseUrl: 'https://generativelanguage.googleapis.com', type: 'video', color: '#4285F4', abbrev: 'V2', capabilities: ['Video Generation'] },
    { name: 'Kling 3.0', provider: 'Kuaishou', slug: 'kling-video/v3/generation', baseUrl: 'https://api.klingai.com', type: 'video', color: '#f472b6', abbrev: 'KL', capabilities: ['Video Generation', 'Multi-shot'] },
    { name: 'Kling 2.1', provider: 'Kuaishou', slug: 'kling-video/v2.1/generation', baseUrl: 'https://api.klingai.com', type: 'video', color: '#f472b6', abbrev: 'KL', capabilities: ['Video Generation'] },
    { name: 'Runway Gen-3', provider: 'Runway', slug: 'gen3a_turbo', baseUrl: 'https://api.dev.runwayml.com', type: 'video', color: '#f97316', abbrev: 'RW', capabilities: ['Video Generation'] },
    { name: 'Minimax Video', provider: 'Minimax', slug: 'video-01', baseUrl: 'https://api.minimax.chat', type: 'video', color: '#34d399', abbrev: 'MX', capabilities: ['Video Generation'] },
];

// Color palette for custom models
export const MODEL_COLORS = [
    '#4285F4', '#d97706', '#10a37f', '#1DA1F2', '#7c3aed',
    '#ec4899', '#3b82f6', '#6366f1', '#f97316', '#14b8a6',
    '#ef4444', '#84cc16', '#f59e0b', '#06b6d4', '#8b5cf6',
    '#ff7000', '#a855f7', '#f472b6', '#34d399', '#fb923c',
];

export const PRESETS = {
    balanced: { name: 'Balanced' },
    codeFocused: { name: 'Code-Focused' },
    creative: { name: 'Creative' },
    research: { name: 'Research' },
};
