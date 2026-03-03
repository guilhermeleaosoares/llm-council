import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../auth/firebase';
import { useAuth } from '../auth/AuthContext';

const CouncilContext = createContext();

const STORAGE_KEYS = {
    models: 'llm-council-user-models',
    conversations: 'llm-council-conversations',
    toolKeys: 'llm-council-tool-keys',
};

const API_BASE = 'http://localhost:3001/api';

function load(key, fallback) {
    try {
        const s = sessionStorage.getItem(key);
        return s ? JSON.parse(s) : fallback;
    } catch { return fallback; }
}
function save(key, d) { sessionStorage.setItem(key, JSON.stringify(d)); }

// Extract first ~2 sentences for a chat summary when canvas is active
function extractSummary(text) {
    if (!text) return '';
    // Remove markdown headings and leading whitespace
    const clean = text.replace(/^#+\s+.*/gm, '').trim();
    // Split into sentences
    const sentences = clean.match(/[^.!?\n]+[.!?]+/g);
    if (sentences && sentences.length >= 2) {
        return sentences.slice(0, 2).join(' ').trim() + '\n\n*Full response written to Canvas →*';
    }
    // Fallback: first 200 chars
    const short = clean.slice(0, 200);
    return short + (clean.length > 200 ? '...\n\n*Full response written to Canvas →*' : '');
}

export function CouncilProvider({ children }) {
    const { user, isGuest } = useAuth();
    const isInitialLoad = useRef(true);

    // ── Models (user-defined, strictly local) ──
    const [models, setModels] = useState(() => load(STORAGE_KEYS.models, []));
    const [toolKeys, setToolKeys] = useState(() => load(STORAGE_KEYS.toolKeys, { n8nUrl: '', n8nApiKey: '' }));

    // ── Conversations (Cloud if auth, else local) ──
    const [conversations, setConversations] = useState(() => {
        const local = load(STORAGE_KEYS.conversations, [
            { id: '1', title: 'New conversation', messages: [], systemPrompt: '' }
        ]);
        return local;
    });

    const [activeConversationId, setActiveConversationId] = useState(() => {
        const local = load(STORAGE_KEYS.conversations, [{ id: '1' }]);
        return local[0]?.id || '1';
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [kingModelId, setKingModelId] = useState(null);
    const [consensusLog, setConsensusLog] = useState(null);
    const [processingPhase, setProcessingPhase] = useState('');
    const [backendRunId, setBackendRunId] = useState(null);
    const [synthesisMode, setSynthesisMode] = useState('choice');

    // ── Firestore Sync Logic ──
    useEffect(() => {
        if (!user || !db) return;

        console.log('[CouncilContext] User detected, syncing with Firestore:', user.uid);
        const userDocRef = doc(db, 'users', user.uid);

        // Fetch user data from Firestore on mount/login
        const unsub = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.conversations) {
                    setConversations(data.conversations);
                }
            } else {
                // First time user: push initial conversation to cloud
                setDoc(userDocRef, { conversations }, { merge: true });
            }
        });

        return () => unsub();
    }, [user]);

    // ── Persistence Handlers ──
    useEffect(() => {
        // Models and Tool Keys are ALWAYS local as requested
        save(STORAGE_KEYS.models, models);
        save(STORAGE_KEYS.toolKeys, toolKeys);
    }, [models, toolKeys]);

    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        if (user && db) {
            // Sync to cloud
            const userDocRef = doc(db, 'users', user.uid);
            setDoc(userDocRef, { conversations }, { merge: true }).catch(err => {
                console.error('[CouncilContext] Cloud sync error:', err);
            });
        } else {
            // Local fallback (guest)
            save(STORAGE_KEYS.conversations, conversations);
        }
    }, [conversations, user]);

    // ── Health Monitor (Auto-Wipe) ──
    // If backend restarts (runId changes) or becomes unreachable, wipe models.
    useEffect(() => {
        let failCount = 0;
        const checkHealth = async () => {
            try {
                const res = await fetch(`${API_BASE}/health`);
                if (!res.ok) throw new Error('Not OK');
                const data = await res.json();

                if (backendRunId && data.runId !== backendRunId) {
                    console.warn('[CouncilContext] Backend restarted! Wiping configuration.');
                    setModels([]); // Wipe models strictly when backend reloads
                    sessionStorage.removeItem(STORAGE_KEYS.models);
                }
                setBackendRunId(data.runId);
                failCount = 0;
            } catch (err) {
                failCount++;
                if (failCount >= 3 && models.length > 0) {
                    console.warn('[CouncilContext] Backend unreachable! Wiping configuration.');
                    setModels([]); // Wipe models strictly when backend is down
                    sessionStorage.removeItem(STORAGE_KEYS.models);
                }
            }
        };

        const interval = setInterval(checkHealth, 10000);
        checkHealth(); // Initial check
        return () => clearInterval(interval);
    }, [backendRunId, models.length]);

    const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0];
    const enabledModels = models.filter(m => m.enabled && m.apiKey);
    const textModels = enabledModels.filter(m => m.type === 'text');
    const imageModels = enabledModels.filter(m => m.type === 'image');
    const videoModels = enabledModels.filter(m => m.type === 'video');

    // ── Model CRUD ──
    const addModel = useCallback((model) => {
        const m = {
            ...model,
            id: Date.now().toString(),
            enabled: true,
            tier: 1,
            weight: 80,
        };
        setModels(prev => [...prev, m]);
        return m;
    }, []);

    const updateModel = useCallback((id, updates) => {
        setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    }, []);

    const removeModel = useCallback((id) => {
        setModels(prev => prev.filter(m => m.id !== id));
    }, []);

    const importModels = useCallback((importedModels) => {
        if (!Array.isArray(importedModels)) return;
        setModels(importedModels.map(m => ({
            ...m,
            // Ensure necessary fields are present, generating new IDs to avoid conflicts if needed,
            // but preserving them is fine for simple import/export.
            id: m.id || Date.now().toString() + Math.random(),
            enabled: m.enabled !== false,
            tier: m.tier || 1,
            weight: typeof m.weight === 'number' ? m.weight : 80,
        })));
    }, []);

    const testModel = useCallback(async (model) => {
        try {
            const res = await fetch(`${API_BASE}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: model.apiKey,
                    baseUrl: model.baseUrl,
                    modelSlug: model.slug,
                    type: model.type,
                }),
            });
            return await res.json();
        } catch (err) {
            return { success: false, error: 'Backend not reachable. Start server: cd server && npm run dev' };
        }
    }, []);

    // ── Conversations ──
    const createConversation = useCallback((projectId = 'default', projectPrompt = '') => {
        const id = Date.now().toString();
        const conv = { id, projectId, title: 'New conversation', messages: [], systemPrompt: projectPrompt };
        setConversations(prev => [conv, ...prev]);
        setActiveConversationId(id);
        return id;
    }, []);

    const deleteConversation = useCallback((id) => {
        setConversations(prev => {
            const next = prev.filter(c => c.id !== id);
            return next; // Return empty array if all deleted, Sidebar's createConversation handles new
        });
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
    }, [activeConversationId]);

    const renameConversation = useCallback((id, title) => {
        setConversations(prev => prev.map(c =>
            c.id === id ? { ...c, title } : c
        ));
    }, []);

    const updateSystemPrompt = useCallback((prompt) => {
        setConversations(prev => prev.map(c =>
            c.id === activeConversationId ? { ...c, systemPrompt: prompt } : c
        ));
    }, [activeConversationId]);

    // ── Web Search ──
    const searchWeb = useCallback(async (query) => {
        try {
            const res = await fetch(`${API_BASE}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            return data.results || [];
        } catch { return []; }
    }, []);

    // ── Deep Web Search ──
    const deepSearchWeb = useCallback(async (query) => {
        try {
            const res = await fetch(`${API_BASE}/deep-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            return { results: data.results || [], queries: data.queries || [] };
        } catch { return { results: [], queries: [] }; }
    }, []);

    // ── Image Generation ──
    const generateImage = useCallback(async (prompt, targetModels = null, attempts = 1, options = {}) => {
        const modelsToUse = targetModels || imageModels;
        if (modelsToUse.length === 0) return;

        // Save the user's prompt as a message first
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: prompt,
            attachments: [],
            imageGeneration: true,
            timestamp: new Date().toISOString(),
        };
        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? {
                    ...c,
                    title: c.messages.length === 0 ? `🎨 ${prompt.slice(0, 40)}` : c.title,
                    messages: [...c.messages, userMessage],
                }
                : c
        ));

        setIsProcessing(true);
        setProcessingPhase('generating image');

        // Fire requests for all active image models, N attempts each
        const allTasks = [];
        for (const model of modelsToUse) {
            for (let i = 0; i < attempts; i++) {
                allTasks.push(
                    fetch(`${API_BASE}/generate-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: model.apiKey,
                            baseUrl: model.baseUrl,
                            modelSlug: model.slug,
                            prompt,
                            aspectRatio: options.aspectRatio,
                            quality: options.quality
                        }),
                    }).then(r => r.json()).then(data => ({
                        modelName: model.name,
                        attempt: i + 1,
                        ...data,
                    })).catch(err => ({ error: err.message, modelName: model.name, attempt: i + 1 }))
                );
            }
        }

        const results = await Promise.all(allTasks);

        // Map results back to chat messages
        const newMessages = results.map((data, idx) => ({
            id: (Date.now() + idx + 1).toString(),
            role: 'council',
            text: data.error ? `Image generation failed (${data.modelName}): ${data.error}` : `Generated by ${data.modelName} (Attempt ${data.attempt}):`,
            imageUrl: data.imageUrl || null,
            imagePrompt: prompt,
            responses: [],
            timestamp: new Date().toISOString(),
        }));

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, ...newMessages] }
                : c
        ));
        setIsProcessing(false);
        setProcessingPhase('');
    }, [activeConversationId, imageModels]);

    // ── Video Generation ──
    const generateVideo = useCallback(async (prompt, targetModels = null, attempts = 1, options = {}) => {
        const videoModels = targetModels || enabledModels.filter(m => m.type === 'video');
        if (videoModels.length === 0) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: prompt,
            attachments: [],
            videoGeneration: true,
            timestamp: new Date().toISOString(),
        };
        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? {
                    ...c,
                    title: c.messages.length === 0 ? `🎥 ${prompt.slice(0, 40)}` : c.title,
                    messages: [...c.messages, userMessage],
                }
                : c
        ));

        setIsProcessing(true);
        setProcessingPhase('generating video');

        const allTasks = [];
        for (const model of videoModels) {
            for (let i = 0; i < attempts; i++) {
                allTasks.push(
                    fetch(`${API_BASE}/generate-video`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: model.apiKey,
                            baseUrl: model.baseUrl,
                            modelSlug: model.slug,
                            prompt,
                            aspectRatio: options.aspectRatio,
                            quality: options.quality,
                            duration: options.duration
                        }),
                    }).then(r => r.json()).then(data => ({
                        modelName: model.name,
                        attempt: i + 1,
                        ...data,
                    })).catch(err => ({ error: err.message, modelName: model.name, attempt: i + 1 }))
                );
            }
        }

        const results = await Promise.all(allTasks);

        const newMessages = results.map((data, idx) => ({
            id: (Date.now() + idx + 1).toString(),
            role: 'council',
            text: data.error ? `Video generation failed (${data.modelName}): ${data.error}` : `Generated by ${data.modelName} (Attempt ${data.attempt}):`,
            videoUrl: data.videoUrl || null,
            imagePrompt: prompt,
            responses: [],
            timestamp: new Date().toISOString(),
        }));

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, ...newMessages] }
                : c
        ));
        setIsProcessing(false);
        setProcessingPhase('');
    }, [activeConversationId, enabledModels]);

    // ── Helper: convert File to base64 ──
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({ mimeType: file.type, base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // ── Helper: call a single model ──
    const callModel = async (model, chatMessages, systemPrompt, temperature = 0.7, images = []) => {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: model.apiKey,
                baseUrl: model.baseUrl,
                modelSlug: model.slug,
                messages: chatMessages,
                systemPrompt,
                temperature,
                images,
            }),
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.content;
    };

    // ── Helper: generate responses from all models ──
    const generateAllResponses = async (modelsArray, chatMessages, systemPrompt, kingId, kingAddendum = '', images = []) => {
        const results = await Promise.allSettled(
            modelsArray.map(async (model) => {
                try {
                    const isKing = model.id === kingId;
                    const content = await callModel(
                        model,
                        chatMessages,
                        systemPrompt + (isKing ? '' : kingAddendum),
                        0.7,
                        images
                    );
                    return {
                        modelId: model.id,
                        modelName: model.name,
                        text: content,
                        isKing,
                        confidence: 0.7 + Math.random() * 0.28,
                        vote: 'agree',
                        error: null,
                    };
                } catch (err) {
                    return {
                        modelId: model.id,
                        modelName: model.name,
                        text: `Error: ${err.message}`,
                        isKing: model.id === kingId,
                        confidence: 0,
                        vote: 'disagree',
                        error: err.message,
                    };
                }
            })
        );

        return results.map(r =>
            r.status === 'fulfilled' ? r.value : {
                modelId: 'unknown', modelName: 'Unknown',
                text: `Error: ${r.reason?.message}`,
                isKing: false, confidence: 0, vote: 'disagree', error: r.reason?.message,
            }
        );
    };

    // ── Send Message (with think modes) ──
    // opts.thinkMode: 'quick' | 'default' | 'deep' | 'deeper'
    // opts.searchMode: boolean (regular search)
    // opts.deepSearch: boolean (deep search)
    const sendMessage = useCallback(async (text, attachments = [], opts = {}) => {
        const thinkMode = opts.thinkMode || 'default';
        const canvasActive = !!opts.canvasActive;
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            text,
            attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type, preview: a.preview })),
            searchResults: null,
            thinkMode,
            timestamp: new Date().toISOString(),
        };

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? {
                    ...c,
                    title: c.messages.length === 0 ? text.slice(0, 50) : c.title,
                    messages: [...c.messages, userMessage],
                }
                : c
        ));

        if (textModels.length === 0) {
            const err = {
                id: (Date.now() + 1).toString(),
                role: 'council',
                text: 'No text models are active. Add models with API keys in Settings.',
                moderationText: '',
                responses: [],
                timestamp: new Date().toISOString(),
            };
            setConversations(prev => prev.map(c =>
                c.id === activeConversationId ? { ...c, messages: [...c.messages, err] } : c
            ));
            return;
        }

        setIsProcessing(true);
        setConsensusLog(null);

        // ── Convert image attachments to base64 ──
        let images = [];
        const imageFiles = attachments.filter(a => a.file instanceof File && a.type?.startsWith('image/'));
        if (imageFiles.length > 0) {
            setProcessingPhase('processing images');
            try {
                images = await Promise.all(imageFiles.map(a => fileToBase64(a.file)));
            } catch (err) {
                console.error('Failed to convert images:', err);
                // Surface error to user instead of silently failing
                const errMsg = {
                    id: (Date.now() + 1).toString(),
                    role: 'council',
                    text: `Failed to process image attachments: ${err.message}. Please try again.`,
                    responses: [],
                    timestamp: new Date().toISOString(),
                };
                setConversations(prev => prev.map(c =>
                    c.id === activeConversationId ? { ...c, messages: [...c.messages, errMsg] } : c
                ));
                setIsProcessing(false);
                setProcessingPhase('');
                return;
            }
        }

        // ── Extract generated images from chat history into multimodal context (last 5 to save tokens) ──
        const historicalImages = (conversations.find(c => c.id === activeConversationId)?.messages || [])
            .filter(m => m.imageBase64)
            .slice(-5)
            .map((m, idx) => ({ mimeType: 'image/png', base64: m.imageBase64 }));
        images.push(...historicalImages);

        // ── Extract text from document attachments (PDF, TXT, MD, CSV, etc.) ──
        let extraTextFromFiles = '';
        const documentFiles = attachments.filter(a => a.file instanceof File && !a.type?.startsWith('image/'));
        if (documentFiles.length > 0) {
            setProcessingPhase('reading documents');
            try {
                // Dynamically import pdfjs to avoid bloating initial bundle
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

                for (const a of documentFiles) {
                    let fileText = '';
                    const f = a.file;

                    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
                        const arrayBuffer = await f.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            fullText += pageText + '\n\n';
                        }
                        fileText = fullText.trim();
                    } else {
                        // Fallback for .txt, .md, .csv, code files, etc.
                        fileText = await f.text();
                    }

                    if (fileText.trim()) {
                        extraTextFromFiles += `\n\n--- Content of attached file: ${a.name} ---\n${fileText.slice(0, 100000)}\n--- End of ${a.name} ---\n`;
                    }
                }
            } catch (err) {
                console.error('Failed to read document attachments:', err);
                const errMsg = {
                    id: (Date.now() + 1).toString(),
                    role: 'council',
                    text: `Failed to read document attachments: ${err.message}. Please try again.`,
                    responses: [],
                    timestamp: new Date().toISOString(),
                };
                setConversations(prev => prev.map(c =>
                    c.id === activeConversationId ? { ...c, messages: [...c.messages, errMsg] } : c
                ));
                setIsProcessing(false);
                setProcessingPhase('');
                return;
            }
        }

        // ── Web search (regular or deep) ──
        let searchResults = null;
        let searchContext = '';
        let deepSearchQueries = null;

        if (opts.deepSearch) {
            setProcessingPhase('deep searching');
            const dsResult = await deepSearchWeb(text);
            searchResults = dsResult.results;
            deepSearchQueries = dsResult.queries;
            if (searchResults.length > 0) {
                searchContext = '\n\n--- Deep Web Search Results (' + searchResults.length + ' sources) ---\n' +
                    searchResults.slice(0, 60).map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n') +
                    '\n--- End Search Results ---\n\nUse the search results above to inform your response. Cite sources with linked titles. Be thorough and comprehensive.';
            }
        } else if (opts.searchMode) {
            setProcessingPhase('searching');
            searchResults = await searchWeb(text);
            if (searchResults.length > 0) {
                searchContext = '\n\n--- Web Search Results ---\n' +
                    searchResults.map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n') +
                    '\n--- End Search Results ---\n\nUse the search results above to inform your response. Cite sources with linked titles when relevant.';
            }
        }

        const conv = conversations.find(c => c.id === activeConversationId);
        const chatMessages = [
            ...(conv?.messages || []).map(m => ({
                role: m.role === 'council' ? 'assistant' : 'user',
                content: m.text,
            })),
            { role: 'user', content: text + searchContext }, // Only append search context here
        ];

        // Ensure models realize they actually HAVE the document content
        let finalSystemPrompt = conv?.systemPrompt || '';
        if (extraTextFromFiles) {
            finalSystemPrompt += `

[SYSTEM DIRECTIVE REGARDING ATTACHED DOCUMENTS]
The user has attached one or more documents. Do NOT state that you cannot read files or open documents. The contents of the documents have already been extracted and provided below. You MUST read this extracted text and use it to answer the user's prompt as if you opened the file yourself.

=== START OF EXTRACTED DOCUMENT CONTENT ===
${extraTextFromFiles}
=== END OF EXTRACTED DOCUMENT CONTENT ===
`;
        }

        // ── Inject Tool Use Directives ──
        const hasImgModels = imageModels?.length > 0;
        const hasVidModels = enabledModels?.some(m => m.type === 'video');
        if (hasImgModels || hasVidModels) {
            finalSystemPrompt += `\n\n[SYSTEM DIRECTIVE REGARDING TOOLS]\nYou have access to the following tools:
${hasImgModels ? `- generate_image: Generates an image based on a prompt.` : ''}
${hasVidModels ? `- generate_video: Generates a video based on a prompt.` : ''}

If the user asks you to generate, create, or modify an image or video, you MUST NOT output standard conversational text. Instead, you MUST output EXACTLY the following JSON block and nothing else. DO NOT wrap it in markdown block quotes.:
{
  "action": "generate_image", // or "generate_video"
  "prompt": "Highly detailed prompt describing the exact desired output..."
}
`;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  QUICK MODE — single cheap model
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (thinkMode === 'quick') {
            setProcessingPhase('generating (quick)');
            // Pick cheapest model: prefer mini/flash/auto/haiku/small variants
            const cheapKeywords = ['auto', 'mini', 'flash', 'haiku', 'small', 'lite'];
            const getCheapScore = (model) => {
                const name = (model.name + ' ' + model.slug).toLowerCase();
                // Higher score = cheaper
                let score = 0;
                for (const kw of cheapKeywords) {
                    if (name.includes(kw)) score += 10;
                }
                // Aggregators (OpenRouter auto) are cheapest
                if (name.includes('openrouter') && name.includes('auto')) score += 20;
                // Higher tier number = assumed cheaper
                score += (model.tier || 1) * 2;
                // Lower weight = assumed cheaper
                score -= (model.weight || 50) / 100;
                return score;
            };
            const sorted = [...textModels].sort((a, b) => getCheapScore(b) - getCheapScore(a));
            const cheapModel = sorted[0] || textModels[0];

            try {
                const content = await callModel(cheapModel, chatMessages, finalSystemPrompt, 0.7, images);
                const chatText = canvasActive ? extractSummary(content) : content;
                const councilMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'council',
                    text: chatText,
                    canvasContent: canvasActive ? content : null,
                    moderationText: `**Quick Mode:** Responded by **${cheapModel.name}** (no council vote).`,
                    responses: [{
                        modelId: cheapModel.id,
                        modelName: cheapModel.name,
                        text: content,
                        isKing: true,
                        confidence: 1,
                        vote: 'agree',
                        error: null,
                        effectiveWeight: 1,
                    }],
                    kingModelId: cheapModel.id,
                    searchResults,
                    thinkMode: 'quick',
                    timestamp: new Date().toISOString(),
                };

                setConversations(prev => prev.map(c =>
                    c.id === activeConversationId
                        ? { ...c, messages: [...c.messages, councilMessage] }
                        : c
                ));
            } catch (err) {
                const errMsg = {
                    id: (Date.now() + 1).toString(),
                    role: 'council',
                    text: `Quick mode failed: ${err.message}`,
                    moderationText: `**Quick Mode Error:** ${cheapModel.name} returned an error.`,
                    responses: [],
                    thinkMode: 'quick',
                    timestamp: new Date().toISOString(),
                };
                setConversations(prev => prev.map(c =>
                    c.id === activeConversationId
                        ? { ...c, messages: [...c.messages, errMsg] }
                        : c
                ));
            }

            setIsProcessing(false);
            setProcessingPhase('');
            return;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  COUNCIL PATH (default, deep, deeper)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // ── Determine King ──
        let activeKingId = kingModelId;
        let consensusResult = null;

        if (!activeKingId && textModels.length > 1) {
            setProcessingPhase('voting');
            try {
                const res = await fetch(`${API_BASE}/consensus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        models: textModels.map(m => ({
                            id: m.id,
                            apiKey: m.apiKey,
                            baseUrl: m.baseUrl,
                            modelSlug: m.slug,
                        })),
                        query: text,
                    }),
                });
                consensusResult = await res.json();
                activeKingId = consensusResult.electedKingId;
                setConsensusLog(consensusResult);
            } catch (err) {
                console.error('Consensus failed, using first model as King:', err);
                activeKingId = textModels[0].id;
            }
        } else if (!activeKingId) {
            activeKingId = textModels[0]?.id;
        }

        const kingModelRef = textModels.find(m => m.id === activeKingId);
        const kingAddendum = kingModelRef
            ? `\n[Council Directive: ${kingModelRef.name} is leading this query. Provide your best analysis.]`
            : '';

        // ── ROUND 1: Initial responses ──
        setProcessingPhase('generating');
        const round1Responses = await generateAllResponses(textModels, chatMessages, finalSystemPrompt, activeKingId, kingAddendum, images);

        const reasoningTrace = [];

        // Store round 1 in trace for deep/deeper
        if (thinkMode === 'deep' || thinkMode === 'deeper') {
            reasoningTrace.push({
                label: 'Round 1: Initial Responses',
                entries: round1Responses.filter(r => !r.error).map(r => ({
                    modelName: r.modelName,
                    text: r.text,
                })),
            });
        }

        let finalResponses = round1Responses;

        // ── ROUND 1.5: Combine Mode Synthesis ──
        if (synthesisMode === 'combine' && finalResponses.length > 1) {
            setProcessingPhase('synthesizing all');
            const validR1 = finalResponses.filter(r => !r.error);
            if (validR1.length > 1) {
                const combinedText = validR1.map(r => `[${r.modelName}]:\n${r.text}`).join('\n\n---\n\n');
                const synthesizePrompt = `You are the lead AI synthesizing responses from a council of experts for the user's prompt. Read the following perspectives from your fellow council members and provide a single, definitive, and highly comprehensive answer that bridges the best insights without directly mentioning that you are summarizing other models.\n\nReviews:\n${combinedText}`;

                const synthMessages = [
                    ...chatMessages,
                    { role: 'user', content: synthesizePrompt },
                ];

                const kingResponse = await generateAllResponses([kingModelRef], synthMessages, finalSystemPrompt, activeKingId, '');

                if (kingResponse[0] && !kingResponse[0].error) {
                    finalResponses = finalResponses.map(r => r.modelId === activeKingId ? kingResponse[0] : r);
                    reasoningTrace.push({
                        label: 'Synthesis (Combine Mode)',
                        entries: [{ modelName: kingModelRef.name, text: kingResponse[0].text }],
                    });
                }
            }
        }

        // ── ROUND 2: Review & fact-check (deep + deeper) ──
        if ((thinkMode === 'deep' || thinkMode === 'deeper') && textModels.length > 0) {
            setProcessingPhase('reviewing (round 2)');
            const kingR1 = round1Responses.find(r => r.isKing && !r.error);
            const reviewPrompt = `You are reviewing and fact-checking the following response from another AI model. Point out any errors, missing information, biases, or improvements needed. Be thorough and specific.\n\nOriginal response:\n${kingR1?.text || round1Responses.find(r => !r.error)?.text || ''}`;

            const reviewMessages = [
                ...chatMessages,
                { role: 'assistant', content: kingR1?.text || '' },
                { role: 'user', content: reviewPrompt },
            ];

            const round2Responses = await generateAllResponses(textModels, reviewMessages, finalSystemPrompt, activeKingId, '');

            reasoningTrace.push({
                label: 'Round 2: Review & Fact-Check',
                entries: round2Responses.filter(r => !r.error).map(r => ({
                    modelName: r.modelName,
                    text: r.text,
                })),
            });

            finalResponses = round2Responses;

            // ── ROUND 3: Synthesis with feedback (deeper only) ──
            if (thinkMode === 'deeper' && textModels.length > 0) {
                setProcessingPhase('synthesizing (round 3)');
                const reviewSummary = round2Responses
                    .filter(r => !r.error)
                    .map(r => `**${r.modelName}** review:\n${r.text}`)
                    .join('\n\n---\n\n');

                const synthesisPrompt = `Based on the original question and the following reviews from multiple AI models, provide a final, comprehensive response that addresses all the feedback, corrections, and improvements. Synthesize the best insights.\n\nReviews:\n${reviewSummary}`;

                const synthesisMessages = [
                    ...chatMessages,
                    { role: 'user', content: synthesisPrompt },
                ];

                const round3Responses = await generateAllResponses(textModels, synthesisMessages, finalSystemPrompt, activeKingId, '');

                reasoningTrace.push({
                    label: 'Round 3: Final Synthesis',
                    entries: round3Responses.filter(r => !r.error).map(r => ({
                        modelName: r.modelName,
                        text: r.text,
                    })),
                });

                finalResponses = round3Responses;
            }
        }

        // ── Apply weights (King gets 3x) ──
        const weighted = finalResponses.map(r => {
            const model = models.find(m => m.id === r.modelId);
            const tierWeight = model?.tier === 1 ? 1.5 : model?.tier === 2 ? 1.0 : 0.7;
            const modelWeight = (model?.weight || 50) / 100;
            const kingMultiplier = r.isKing ? 3.0 : 1.0;
            return { ...r, effectiveWeight: r.error ? 0 : tierWeight * modelWeight * r.confidence * kingMultiplier };
        });
        weighted.sort((a, b) => b.effectiveWeight - a.effectiveWeight);

        const ok = weighted.filter(r => !r.error);
        const kingResp = weighted.find(r => r.isKing && !r.error);
        const total = textModels.length;

        const thinkLabel = thinkMode === 'deep' ? ' (Deep Think — 2 rounds)' :
            thinkMode === 'deeper' ? ' (Deeper Think — 3 rounds)' : '';
        const searchLabel = opts.deepSearch ? ` Web Deep Search (${searchResults?.length || 0} sources).` :
            opts.searchMode && searchResults?.length > 0 ? ` Web Search (${searchResults.length} results).` : '';

        const moderationText = ok.length > 0
            ? `**Council Verdict${thinkLabel}:** ${ok.length}/${total} models responded. ` +
            `**${kingResp?.modelName || weighted[0]?.modelName}** led as King` +
            (consensusResult ? ` (elected via consensus — ${consensusResult.consensusDomain} domain, ${consensusResult.latencyMs}ms, ~${consensusResult.estimatedTokens} tokens).` : '.') +
            ` Average confidence: ${Math.round(ok.reduce((s, r) => s + r.confidence, 0) / ok.length * 100)}%.${searchLabel}`
            : '**Council Verdict:** No models responded successfully.';

        const synthesis = kingResp?.text || (ok.length > 0 ? weighted[0].text : 'All models failed. Check API keys in Settings.');

        // ── Check for Tool Call Interception ──
        let isToolCall = false;
        let toolAction = null;
        let toolPrompt = null;
        try {
            // Strip markdown formatting if the model leaked it
            let cleanJSON = synthesis.trim();
            if (cleanJSON.startsWith('```json')) cleanJSON = cleanJSON.substring(7);
            else if (cleanJSON.startsWith('```')) cleanJSON = cleanJSON.substring(3);
            if (cleanJSON.endsWith('```')) cleanJSON = cleanJSON.substring(0, cleanJSON.length - 3);

            const parsed = JSON.parse(cleanJSON.trim());
            if (parsed && (parsed.action === 'generate_image' || parsed.action === 'generate_video') && parsed.prompt) {
                isToolCall = true;
                toolAction = parsed.action;
                toolPrompt = parsed.prompt;
            }
        } catch (e) { /* not JSON */ }

        if (isToolCall) {
            const toolMsg = {
                id: (Date.now() + 1).toString(),
                role: 'council',
                text: `*Autonomously invoking ${toolAction.replace('_', ' ')}...*\n\n**Optimized Prompt:** ${toolPrompt}`,
                responses: weighted,
                timestamp: new Date().toISOString()
            };
            setConversations(prev => prev.map(c =>
                c.id === activeConversationId
                    ? { ...c, messages: [...c.messages, toolMsg] }
                    : c
            ));
            setIsProcessing(false);
            setProcessingPhase('');

            // Trigger actual media generation autonomously
            if (toolAction === 'generate_image') {
                setTimeout(() => generateImage(toolPrompt), 500);
            } else {
                setTimeout(() => generateVideo(toolPrompt), 500);
            }
            return;
        }

        const chatText = canvasActive ? extractSummary(synthesis) : synthesis;

        const councilMessage = {
            id: (Date.now() + 1).toString(),
            role: 'council',
            text: chatText,
            canvasContent: canvasActive ? synthesis : null,
            moderationText,
            responses: weighted,
            consensusLog: consensusResult,
            kingModelId: activeKingId,
            searchResults,
            deepSearchQueries: deepSearchQueries,
            thinkMode,
            reasoningTrace: reasoningTrace.length > 0 ? reasoningTrace : null,
            timestamp: new Date().toISOString(),
        };

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, councilMessage] }
                : c
        ));

        setIsProcessing(false);
        setProcessingPhase('');
    }, [activeConversationId, textModels, models, kingModelId, synthesisMode, conversations, searchWeb, deepSearchWeb]);

    // ── Retry: remove last council message and re-send ──
    const retryMessage = useCallback(async (councilMsgId) => {
        const conv = conversations.find(c => c.id === activeConversationId);
        if (!conv) return;

        const msgIdx = conv.messages.findIndex(m => m.id === councilMsgId);
        if (msgIdx < 0) return;

        const userMsg = conv.messages.slice(0, msgIdx).reverse().find(m => m.role === 'user');
        if (!userMsg) return;

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: c.messages.filter(m => m.id !== userMsg.id && m.id !== councilMsgId) }
                : c
        ));

        const opts = {
            searchMode: !!userMsg.searchResults,
            thinkMode: userMsg.thinkMode || 'default',
        };

        await sendMessage(userMsg.text, userMsg.attachments || [], opts);
    }, [activeConversationId, conversations, sendMessage]);

    return (
        <CouncilContext.Provider value={{
            models,
            addModel,
            updateModel,
            removeModel,
            importModels,
            testModel,
            enabledModels,
            textModels,
            imageModels,
            videoModels,
            conversations,
            activeConversation,
            activeConversationId,
            setActiveConversationId,
            createConversation,
            renameConversation,
            deleteConversation,
            updateSystemPrompt,
            sendMessage,
            retryMessage,
            generateImage,
            generateVideo,
            isProcessing,
            processingPhase,
            kingModelId,
            setKingModelId,
            synthesisMode,
            setSynthesisMode,
            consensusLog,
            toolKeys,
            setToolKeys,
        }}>
            {children}
        </CouncilContext.Provider>
    );
}

export const useCouncil = () => useContext(CouncilContext);
