import { useState, useRef, useEffect } from 'react';
import { useCouncil } from '../../context/CouncilContext';
import { useStudy } from '../../context/StudyContext';
import { Search, Loader2, User, Globe, Plus, Link as LinkIcon, ExternalLink, Check } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

const API_BASE = 'http://localhost:3001/api';

export default function WebSearchPanel({ notebook }) {
    const { addSourceToNotebook } = useStudy();
    const { textModels, kingModelId } = useCouncil();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [addedSources, setAddedSources] = useState(new Set());
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isSearching) return;
        const query = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: query }]);
        setIsSearching(true);

        try {
            // 1. Search Web
            setMessages(prev => [...prev, { role: 'assistant', content: `Searching the web for "${query}"...`, isTemp: true }]);
            const searchRes = await fetch(`${API_BASE}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const searchData = await searchRes.json();
            const results = searchData.results || [];

            if (results.length === 0) {
                setMessages(prev => {
                    const filtered = prev.filter(m => !m.isTemp);
                    return [...filtered, { role: 'assistant', content: "No results found." }];
                });
                return;
            }

            setMessages(prev => {
                const filtered = prev.filter(m => !m.isTemp);
                return [...filtered, { role: 'assistant', content: `Found ${results.length} results. Analyzing...`, isTemp: true }];
            });

            // 2. Call AI (Combine Mode / All Models)
            const kingModel = textModels.find(m => m.id === kingModelId) || textModels[0];
            if (!kingModel) throw new Error("No text model available.");

            const searchJsonSnippet = JSON.stringify(results.slice(0, 5).map(r => ({ title: r.title, content: r.content, url: r.url })));
            const systemPrompt = `You are a web research assistant. The user asked: "${query}". Based on these web results, summarize the findings. Provide a quick concise summary.\n\nWeb Results:\n${searchJsonSnippet}`;

            // Phase A: Run all models on the search results
            const modelPromises = textModels.map(async (model) => {
                try {
                    const res = await fetch(`${API_BASE}/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: model.apiKey,
                            baseUrl: model.baseUrl,
                            modelSlug: model.slug,
                            messages: [{ role: 'user', content: "Summarize the search results to help me decide which sources to add." }],
                            systemPrompt,
                            temperature: 0.7,
                            images: []
                        }),
                    });
                    const data = await res.json().catch(() => null);
                    return data && res.ok ? { model: model.name, content: data.content } : null;
                } catch (e) {
                    return null;
                }
            });

            const unparsedResponses = await Promise.all(modelPromises);
            const validResponses = unparsedResponses.filter(r => r !== null);

            // Phase B: King Model Synthesis
            let finalOutput = '';
            if (validResponses.length === 0) {
                throw new Error("All council models failed to analyze the results.");
            } else if (validResponses.length === 1) {
                finalOutput = validResponses[0].content;
            } else {
                setMessages(prev => {
                    const filtered = prev.filter(m => !m.isTemp);
                    return [...filtered, { role: 'assistant', content: `Synthesizing insights from ${validResponses.length} council models...`, isTemp: true }];
                });

                const synthesisContext = validResponses.map(r => `[${r.model}]:\n${r.content}`).join('\n\n--- \n\n');

                const synthRes = await fetch(`${API_BASE}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey: kingModel.apiKey,
                        baseUrl: kingModel.baseUrl,
                        modelSlug: kingModel.slug,
                        messages: [{ role: 'user', content: `The following are analyses from various AI experts regarding the user's web search for "${query}". Please synthesize them into one cohesive, highly informative summary.\n\n${synthesisContext}` }],
                        systemPrompt: "You are the Council Lead. Synthesize the provided expert reports into a unified summary.",
                        temperature: 0.5,
                        images: []
                    }),
                });

                const synthData = await synthRes.json();
                if (synthRes.ok && synthData.content) {
                    finalOutput = synthData.content;
                } else {
                    finalOutput = validResponses[0].content; // Fallback
                }
            }

            // Remove temp msg and add final + sources
            setMessages(prev => {
                const filtered = prev.filter(m => !m.isTemp);
                return [...filtered, { role: 'assistant', content: finalOutput, sources: results.slice(0, 5) }];
            });

        } catch (e) {
            setMessages(prev => prev.filter(m => !m.isTemp).concat({ role: 'assistant', content: `Error: ${e.message}` }));
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddSource = async (result) => {
        setIsSearching(true);
        try {
            const scrapeRes = await fetch(`${API_BASE}/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: result.url }),
            });
            const scrapeData = await scrapeRes.json();

            const textToSave = `Title: ${scrapeData.title || result.title}\nURL: ${result.url}\n\nContent:\n${scrapeData.text || result.content}`;

            addSourceToNotebook(notebook.id, {
                name: scrapeData.title || result.title || 'Web Search Result',
                text: textToSave,
                type: 'web',
                preview: (scrapeData.text || result.content)?.substring(0, 50) + '...',
                url: result.url
            });

            setAddedSources(prev => new Set(prev).add(result.url));
            setTimeout(() => {
                setAddedSources(prev => {
                    const next = new Set(prev);
                    next.delete(result.url);
                    return next;
                });
            }, 2000);
        } catch (e) {
            console.error(e);
            // Fallback to snippet
            const textToSave = `Title: ${result.title}\nURL: ${result.url}\n\nContent:\n${result.content}`;
            addSourceToNotebook(notebook.id, {
                name: result.title || 'Web Search Result',
                text: textToSave,
                type: 'web',
                preview: result.content?.substring(0, 50) + '...',
                url: result.url
            });

            setAddedSources(prev => new Set(prev).add(result.url));
            setTimeout(() => {
                setAddedSources(prev => {
                    const next = new Set(prev);
                    next.delete(result.url);
                    return next;
                });
            }, 2000);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px' }}>
                        <Globe size={24} style={{ opacity: 0.5, marginBottom: '10px' }} />
                        <p>Ask the Council to search the web for new sources.</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ flexShrink: 0, marginTop: '2px', color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                    {msg.role === 'user' ? <User size={14} /> : (msg.isTemp ? <Loader2 size={14} className="spin" /> : <Globe size={14} />)}
                                </div>
                                <div style={{ fontSize: '12px', color: msg.isTemp ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1.5, minWidth: 0, overflowWrap: 'break-word', width: '100%' }}>
                                    {msg.role === 'assistant' && !msg.isTemp ? (
                                        <MarkdownRenderer content={msg.content} />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>

                            {/* Render search results as cards to add */}
                            {msg.sources && msg.sources.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingLeft: '22px' }}>
                                    {msg.sources.map((src, sIdx) => (
                                        <div key={sIdx} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {src.title}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <LinkIcon size={10} /> {src.url}
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {src.content}
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                <button onClick={() => window.open(src.url, '_blank')} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-secondary)', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <ExternalLink size={10} /> Open
                                                </button>
                                                <button onClick={() => handleAddSource(src)} disabled={addedSources.has(src.url)} style={{ background: addedSources.has(src.url) ? 'var(--accent)' : 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '4px', color: addedSources.has(src.url) ? 'white' : 'var(--text-accent)', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, transition: 'all 0.2s ease-in-out' }}>
                                                    {addedSources.has(src.url) ? <><Check size={10} /> Added!</> : <><Plus size={10} /> Add Source</>}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '10px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '4px 8px' }}>
                    <Search size={14} color="var(--text-muted)" style={{ margin: '0 6px' }} />
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSend();
                        }}
                        placeholder="Search the web..."
                        style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '12px', padding: '6px 0', outline: 'none' }}
                        disabled={isSearching}
                    />
                </div>
            </div>
        </div>
    );
}
