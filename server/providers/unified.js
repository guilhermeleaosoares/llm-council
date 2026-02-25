// ── Unified Provider Module ──
// Handles Gemini, Anthropic, Cohere, and all OpenAI-compatible APIs
// (OpenRouter, xAI, DeepSeek, Together, Groq, HuggingFace, AIMLAPI, etc.)
// Supports multimodal (text + images) for vision-capable providers.

// ── Detect provider type from baseUrl ──
function getProviderType(baseUrl) {
    if (!baseUrl) return 'openai-compat';
    const u = baseUrl.toLowerCase();
    if (u.includes('generativelanguage.googleapis.com')) return 'gemini';
    if (u.includes('api.anthropic.com')) return 'anthropic';
    if (u.includes('api.cohere.com')) return 'cohere';
    return 'openai-compat';
}

// ── Build multimodal content parts ──
// images: array of { mimeType, base64 }
function buildGeminiParts(text, images = []) {
    const parts = [];
    if (text) parts.push({ text });
    for (const img of images) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }
    return parts;
}

function buildOpenAIParts(text, images = []) {
    if (!images || images.length === 0) return text;
    const parts = [];
    if (text) parts.push({ type: 'text', text });
    for (const img of images) {
        parts.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        });
    }
    return parts;
}

function buildAnthropicParts(text, images = []) {
    if (!images || images.length === 0) return text;
    const parts = [];
    for (const img of images) {
        parts.push({
            type: 'image',
            source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
        });
    }
    if (text) parts.push({ type: 'text', text });
    return parts;
}

// ── Gemini REST API ──
async function callGemini({ apiKey, modelSlug, messages, systemPrompt, temperature = 0.7, images = [] }) {
    const slug = modelSlug || 'gemini-2.5-pro-preview-05-06';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${slug}:generateContent?key=${apiKey}`;

    // Gemini requires alternating user/model roles. Merge consecutive same-role messages.
    const merged = [];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const role = m.role === 'assistant' ? 'model' : 'user';
        // Attach images to the last user message
        const isLastUser = (i === messages.length - 1 && role === 'user');
        const parts = isLastUser && images.length > 0
            ? buildGeminiParts(m.content, images)
            : [{ text: m.content }];

        if (merged.length > 0 && merged[merged.length - 1].role === role) {
            merged[merged.length - 1].parts.push(...parts);
        } else {
            merged.push({ role, parts });
        }
    }
    // Gemini must start with user role
    if (merged.length > 0 && merged[0].role !== 'user') {
        merged.unshift({ role: 'user', parts: [{ text: '.' }] });
    }

    const body = {
        contents: merged,
        generationConfig: { temperature, maxOutputTokens: 4096 },
    };
    if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `Gemini API error: ${res.status}`;
        console.error('[Gemini] Full error:', JSON.stringify(err, null, 2));
        throw Object.assign(new Error(msg), { status: res.status });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text };
}

// ── Anthropic Messages API ──
async function callAnthropic({ apiKey, modelSlug, messages, systemPrompt, temperature = 0.7, images = [] }) {
    const body = {
        model: modelSlug || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature,
        messages: messages.map((m, i) => {
            const role = m.role === 'assistant' ? 'assistant' : 'user';
            const isLastUser = (i === messages.length - 1 && role === 'user');
            return {
                role,
                content: isLastUser && images.length > 0
                    ? buildAnthropicParts(m.content, images)
                    : m.content,
            };
        }),
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `Anthropic API error: ${res.status}`;
        console.error('[Anthropic] Full error:', JSON.stringify(err, null, 2));
        throw Object.assign(new Error(msg), { status: res.status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return { content: text };
}

// ── OpenAI-Compatible (OpenRouter, xAI, DeepSeek, Together, Groq, etc.) ──
async function callOpenAICompat({ apiKey, baseUrl, modelSlug, messages, systemPrompt, temperature = 0.7, images = [] }) {
    const endpoint = (baseUrl || 'https://api.openai.com').replace(/\/+$/, '');

    let url = `${endpoint}/v1/chat/completions`;
    // Kie AI docs specify the model slug in the URL path for chat completions
    if (endpoint.includes('api.kie.ai')) {
        const base = endpoint.replace(/\/v1$/, '');
        url = `${base}/${modelSlug}/v1/chat/completions`;
    }

    const msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    msgs.push(...messages.map((m, i) => {
        const isLastUser = (i === messages.length - 1 && m.role === 'user');
        return {
            role: m.role,
            content: isLastUser && images.length > 0
                ? buildOpenAIParts(m.content, images)
                : m.content,
        };
    }));

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    // OpenRouter requires extra headers
    if (endpoint.includes('openrouter.ai')) {
        headers['HTTP-Referer'] = 'http://localhost:5173';
        headers['X-Title'] = 'LLM Council';
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: modelSlug || 'gpt-4o',
            messages: msgs,
            temperature,
            max_tokens: 4096,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `API error: ${res.status}`;
        console.error(`[OpenAI-Compat ${endpoint}] Full error:`, JSON.stringify(err, null, 2));
        throw Object.assign(new Error(msg), { status: res.status });
    }

    const data = await res.json();

    // Some providers like Kie AI return HTTP 200 with { code: 401, msg: "...Auth failed..." }
    if (data && data.code && data.code !== 200) {
        throw new Error(data.msg || data.error || data.message || `Provider API error: code ${data.code}`);
    }

    const text = data.choices?.[0]?.message?.content || '';
    return { content: text };
}

// ── Kie AI Native Media Generation (Tasks / Polling) ──
async function callKieMediaGen({ apiKey, baseUrl, modelSlug, prompt, type, aspectRatio, quality, duration }) {
    const createUrl = 'https://api.kie.ai/api/v1/jobs/createTask';
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelSlug,
            input: {
                prompt,
                aspect_ratio: aspectRatio || '16:9',
                quality: quality || 'standard',
                duration: duration ? String(duration) : "5"
            }
        })
    });

    let createJson;
    try {
        createJson = await createRes.json();
    } catch {
        throw new Error(`Kie AI task creation failed with status ${createRes.status}`);
    }

    if (!createRes.ok || (createJson && createJson.code && createJson.code !== 200)) {
        throw Object.assign(new Error(createJson?.msg || createJson?.error || createJson?.message || 'Kie AI task creation failed'), { status: createJson?.code || createRes.status });
    }

    const createData = createJson?.data;
    const taskId = createData?.task_id || createData?.taskId;
    if (!taskId) throw new Error('Kie AI: No task ID returned from createTask.');

    console.log(`[Kie.ai] Started task ${taskId} for ${modelSlug}. Polling...`);
    const startTime = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

    while (Date.now() - startTime < TIMEOUT_MS) {
        // Wait 3 seconds per poll
        await new Promise(r => setTimeout(r, 3000));

        const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!pollRes.ok) {
            console.error('[Kie.ai] Poll failed with status', pollRes.status);
            continue;
        }

        const pollJson = await pollRes.json();
        const info = pollJson?.data;
        if (!info) continue;

        const state = (info.state || info.status || '').toLowerCase();

        if (state === 'success' || state === 'finished') {
            console.log(`[Kie.ai] Task ${taskId} finished!`);
            let mediaUrl = '';

            // Kie AI returns the generated URLs inside a stringified JSON field
            if (info.resultJson) {
                try {
                    const parsed = typeof info.resultJson === 'string' ? JSON.parse(info.resultJson) : info.resultJson;
                    mediaUrl = parsed.resultUrls?.[0] || parsed.resultObject?.url || '';
                } catch (e) {
                    console.error('[Kie.ai] Failed to parse resultJson:', info.resultJson);
                }
            }

            // Fallbacks for older Kie logic if applicable
            if (!mediaUrl) mediaUrl = info.taskResult?.imageUrl || info.taskResult?.videoUrl || info.imageUrl || info.videoUrl || info.url || info.images?.[0];

            if (!mediaUrl) throw new Error('Kie AI: Task succeeded but no media URL found in payload.');
            return { content: '', [type === 'image' ? 'imageUrl' : 'videoUrl']: mediaUrl, type };
        } else if (state === 'fail' || state === 'error' || state === 'create_task_failed' || state === 'generate_failed') {
            throw new Error(`Kie AI task failed: ${info.failMsg || info.failReason || state}`);
        }
        // state is 'waiting', 'queuing', 'generating' -> continue polling
    }

    throw new Error('Kie AI media generation timed out after 5 minutes.');
}

// ── Image Generation (multi-provider) ──
async function callImageGen({ apiKey, baseUrl, modelSlug, prompt }) {
    const endpoint = (baseUrl || 'https://api.openai.com').replace(/\/+$/, '');

    // ── fal.ai (FLUX, Nano Banana, etc.) ──
    if (endpoint.includes('fal.run') || endpoint.includes('fal.ai')) {
        const url = `https://fal.run/${modelSlug}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${apiKey}`,
            },
            body: JSON.stringify({
                prompt,
                image_size: 'landscape_16_9',
                num_images: 1,
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw Object.assign(new Error(err?.detail || err?.error?.message || 'fal.ai image generation failed'), { status: res.status });
        }
        const data = await res.json();
        const imageUrl = data.images?.[0]?.url || data.output?.url || '';
        return { content: '', imageUrl, type: 'image' };
    }

    // ── Google (Gemini Image / Imagen via generativelanguage API) ──
    if (endpoint.includes('generativelanguage.googleapis.com')) {
        // Gemini image models (Nano Banana, etc.) use generateContent with IMAGE modality
        const isGeminiImage = modelSlug.includes('gemini');
        if (isGeminiImage) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelSlug}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ['IMAGE'] },
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw Object.assign(new Error(err?.error?.message || 'Gemini image generation failed'), { status: res.status });
            }
            const data = await res.json();
            // Find the image part in the response
            const parts = data.candidates?.[0]?.content?.parts || [];
            const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
            if (imgPart) {
                return { content: '', imageUrl: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`, type: 'image' };
            }
            // Fallback: check for text response
            const textPart = parts.find(p => p.text);
            if (textPart) {
                throw new Error(`Model returned text instead of image: ${textPart.text.slice(0, 200)}`);
            }
            throw new Error('No image data returned from Gemini');
        }

        // Imagen models use the predict endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelSlug}:predict?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1 },
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw Object.assign(new Error(err?.error?.message || 'Imagen generation failed'), { status: res.status });
        }
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
            return { content: '', imageUrl: `data:image/png;base64,${b64}`, type: 'image' };
        }
        throw new Error('No image data returned from Imagen');
    }

    // ── HuggingFace Inference API (FLUX, Stable Diffusion, etc.) ──
    if (endpoint.includes('huggingface.co') || endpoint.includes('hf.co')) {
        const url = `https://router.huggingface.co/hf-inference/models/${modelSlug}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 25,
                    guidance_scale: 7.5,
                },
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw Object.assign(new Error(err?.error || err?.message || 'HuggingFace image generation failed'), { status: res.status });
        }

        // HuggingFace returns raw image bytes
        const contentType = res.headers.get('content-type') || 'image/png';
        if (contentType.startsWith('image/')) {
            const buffer = await res.arrayBuffer();
            const b64 = Buffer.from(buffer).toString('base64');
            return { content: '', imageUrl: `data:${contentType};base64,${b64}`, type: 'image' };
        }
        // Fallback: maybe JSON response with image URL
        const data = await res.json();
        const imageUrl = data?.[0]?.url || data?.url || '';
        if (imageUrl) return { content: '', imageUrl, type: 'image' };
        throw new Error('No image data returned from HuggingFace');
    }

    // ── AIMLAPI (OpenAI-compatible image endpoint) ──
    if (endpoint.includes('aimlapi.com')) {
        const url = `${endpoint}/v1/images/generations`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelSlug || 'flux-pro',
                prompt,
                n: 1,
                size: '1024x1024',
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw Object.assign(new Error(err?.error?.message || 'AIMLAPI image generation failed'), { status: res.status });
        }
        const data = await res.json();
        const imgData = data.data?.[0];
        const imageUrl = imgData?.url || (imgData?.b64_json ? `data:image/png;base64,${imgData.b64_json}` : '');
        return { content: '', imageUrl, type: 'image' };
    }

    // ── OpenAI / xAI / OpenAI-compatible (DALL-E, GPT Image, Grok Image) ──
    const url = `${endpoint}/v1/images/generations`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelSlug || 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let errMsg = 'Image generation failed';
        try {
            const errJson = JSON.parse(errText);
            errMsg = errJson?.error?.message || errJson?.message || errText;
        } catch {
            errMsg = errText || `HTTP ${res.status}`;
        }
        console.error(`[callImageGen] failed for ${modelSlug}:`, errText);
        throw Object.assign(new Error(errMsg), { status: res.status });
    }

    const data = await res.json();
    // Handle both url and b64_json responses
    const imgData = data.data?.[0];
    const imageUrl = imgData?.url || (imgData?.b64_json ? `data:image/png;base64,${imgData.b64_json}` : '');
    return { content: '', imageUrl, type: 'image' };
}

// ── Video Generation (multi-provider) ──
async function callVideoGen({ apiKey, baseUrl, modelSlug, prompt }) {
    const endpoint = (baseUrl || 'https://api.openai.com').replace(/\/+$/, '');

    // Default to an OpenAI compatible endpoint for videos (like AIMLAPI / Kie AI / Luma)
    const url = `${endpoint}/v1/videos/generations`; // Typical standard endpoint for aggregators

    // For specific known services, we might need a custom route. But for Kie AI base, we assume standard:
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelSlug,
            prompt,
        }),
    });

    if (!res.ok) {
        // Fallback: Try image generation endpoint but with video model if aggregator maps it that way
        if (res.status === 404) {
            const fallbackRes = await fetch(`${endpoint}/v1/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: modelSlug, prompt, n: 1 })
            });
            if (fallbackRes.ok) {
                const fbData = await fallbackRes.json();
                const vUrl = fbData.data?.[0]?.url;
                return { content: '', videoUrl: vUrl, type: 'video' };
            }
        }

        const errText = await res.text().catch(() => '');
        let errMsg = 'Video generation failed';
        try {
            const errJson = JSON.parse(errText);
            errMsg = errJson?.error?.message || errJson?.message || errText;
        } catch {
            errMsg = errText || `HTTP ${res.status}`;
        }
        console.error(`[callVideoGen] failed for ${modelSlug}:`, errText);
        throw Object.assign(new Error(errMsg), { status: res.status });
    }

    const data = await res.json();
    // Video endpoints usually return an ID to poll, or a direct URL if fast. We will assume direct URL for MVP.
    const videoUrl = data.data?.[0]?.url || data.url || data.video_url || '';
    if (!videoUrl) {
        return { content: `Video task started and returned: \n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``, videoUrl: null, type: 'video' };
    }
    return { content: '', videoUrl, type: 'video' };
}

// ── Cohere Chat API ──
async function callCohere({ apiKey, modelSlug, messages, systemPrompt, temperature = 0.7, images = [] }) {
    const msgs = messages.map((m, i) => {
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        // Cohere supports content as array for multimodal
        if (i === messages.length - 1 && role === 'user' && images.length > 0) {
            const content = [];
            if (m.content) content.push({ type: 'text', text: m.content });
            for (const img of images) {
                content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
            }
            return { role, content };
        }
        return { role, content: m.content };
    });

    const body = {
        model: modelSlug || 'command-r-plus',
        messages: msgs,
        temperature,
        max_tokens: 4096,
    };
    if (systemPrompt) {
        // Cohere v2 uses a system preamble
        body.messages = [{ role: 'system', content: systemPrompt }, ...body.messages];
    }

    const res = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.message || err?.error?.message || `Cohere API error: ${res.status}`;
        console.error('[Cohere] Full error:', JSON.stringify(err, null, 2));
        throw Object.assign(new Error(msg), { status: res.status });
    }

    const data = await res.json();
    const text = data.message?.content?.[0]?.text || data.text || '';
    return { content: text };
}

// ── Helper: Map legacy UI slugs to exact Kie AI OpenAPI slugs ──
function mapKieModelSlug(slug) {
    switch (slug) {
        case 'nano-banana': return 'google/nano-banana';
        case 'seedream-4.5': return 'bytedance/seedream';
        case 'grok-imagine': return 'grok-imagine/text-to-image';
        case 'kling-2.6':
        case 'kling-2.1': return 'kling/v2-1-pro';
        case 'grok-imagine-video': return 'grok-imagine/text-to-video';
        default: return slug;
    }
}

// ── Router ──
export async function callProvider(config) {
    const { baseUrl, type } = config;
    const providerType = getProviderType(baseUrl);

    const isKie = (baseUrl || '').includes('kie.ai');
    if (isKie) config.modelSlug = mapKieModelSlug(config.modelSlug);

    if (type === 'image') {
        if (isKie) return callKieMediaGen(config);
        return callImageGen(config);
    }
    if (type === 'video') {
        if (isKie) return callKieMediaGen(config);
        return callVideoGen(config);
    }

    switch (providerType) {
        case 'gemini': return callGemini(config);
        case 'anthropic': return callAnthropic(config);
        case 'cohere': return callCohere(config);
        default: return callOpenAICompat(config);
    }
}

// ── Test connection (lightweight) ──
export async function testProvider(config) {
    const { baseUrl, type } = config;

    const isKie = (baseUrl || '').includes('kie.ai');
    if (isKie) config.modelSlug = mapKieModelSlug(config.modelSlug);

    if (type === 'image' || type === 'video') {
        const endpoint = (baseUrl || '').replace(/\/+$/, '');

        // Test Kie AI Native Media Auth
        if (isKie) {
            try {
                const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                    body: JSON.stringify({ model: config.modelSlug, input: {} })
                });
                const resJson = await res.json().catch(() => ({}));
                const isAuthError = res.status === 401 || res.status === 403 || resJson.code === 401 || resJson.code === 403;
                if (isAuthError) {
                    throw new Error(resJson?.msg || resJson?.error || resJson?.message || 'Authentication failed — check your Kie AI API key');
                }
                // If it fails for input validation (400, 422), the key is valid.
                return { success: true, response: `Kie AI key valid for ${config.modelSlug}` };
            } catch (err) {
                if (err.message.includes('Authentication') || err.message.includes('Cannot access')) throw err;
                return { success: true, response: `Kie AI key accepted` };
            }
        }

        // fal.ai — test auth by checking a lightweight endpoint
        if (endpoint.includes('fal.run') || endpoint.includes('fal.ai')) {
            try {
                const res = await fetch(`https://fal.run/${config.modelSlug}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Key ${config.apiKey}`,
                    },
                    body: JSON.stringify({ prompt: 'test', num_images: 0 }),
                });
                // 401/403 = bad key, 422 = key works (validation error is fine)
                if (res.status === 401 || res.status === 403) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.detail || 'Authentication failed — check your fal.ai API key');
                }
                return { success: true, response: `fal.ai key valid for ${config.modelSlug}` };
            } catch (err) {
                if (err.message.includes('Authentication') || err.message.includes('Cannot access')) {
                    throw err;
                }
                return { success: true, response: `fal.ai key accepted` };
            }
        }

        // For other image providers, validate key format
        return { success: true, response: 'Image API key set — generate an image to fully test' };
    }

    if (type === 'video') {
        return { success: true, response: 'Video API key set' };
    }

    const testConfig = {
        ...config,
        messages: [{ role: 'user', content: 'Reply with only the word "ok".' }],
        systemPrompt: '',
        temperature: 0,
    };

    const result = await callProvider(testConfig);
    return { success: true, response: result.content?.slice(0, 100) };
}
