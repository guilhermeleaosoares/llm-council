import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Settings, CheckCircle } from 'lucide-react';
import { useCouncil } from '../context/CouncilContext';
import MarkdownRenderer from './MarkdownRenderer';
import CouncilLogo from './CouncilLogo';

export default function AutomationCouncilSidebar({ n8nJson }) {
    const { textModels, toolKeys } = useCouncil();
    const [messages, setMessages] = useState([
        { id: '1', role: 'council', text: "Hi! I'm the Council. I can help you create, tune, and debug your n8n workflows. What do you need?" }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMsg = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        const model = textModels.find(m => m.tier === 1) || textModels[0];
        if (!model) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'council', text: "No LLM models are active in settings." }]);
            setIsThinking(false);
            return;
        }

        const systemPrompt = `You are the LLM Council helping the user build their n8n automation workflow.
Be concise, helpful, and technical when necessary.
${n8nJson ? `Here is their current n8n JSON context:\n\`\`\`json\n${n8nJson}\n\`\`\`` : `The user has not provided an active n8n JSON context.`}

IMPORTANT INSTRUCTION FOR n8n JSON GENERATION:
If the user asks you to build or modify an n8n workflow, you MUST output the complete n8n workflow representation in valid JSON format. Provide the JSON inside a standard markdown code block \`\`\`json\n...\n\`\`\`. Do not use any custom markdown wrappers. Use standard n8n node formats and structures.

If you are just answering a general question or explaining a concept, just reply normally.`;

        try {
            const chatMessages = messages.map(m => ({ role: m.role === 'council' ? 'assistant' : 'user', content: m.text }));
            chatMessages.push({ role: 'user', content: userMsg.text });

            const res = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: model.apiKey,
                    baseUrl: model.baseUrl,
                    modelSlug: model.slug,
                    messages: chatMessages,
                    systemPrompt,
                    temperature: 0.7
                })
            });
            const data = await res.json();

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'council', text: data.content }]);
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'council', text: "Sorry, I encountered an error answering your request." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CouncilLogo size={20} />
                    <h3 style={{ margin: 0, fontSize: 16 }}>Council Assistant</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    {toolKeys?.n8nUrl ? (
                        <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> n8n Ready</span>
                    ) : (
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Settings size={10} /> No Config</span>
                    )}
                    <span style={{ color: 'var(--border-strong)' }}>|</span>
                    {n8nJson ? (
                        <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> JSON Loaded</span>
                    ) : (
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>No JSON Context</span>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {m.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="var(--text-accent)" />}
                        </div>
                        <div style={{ background: m.role === 'user' ? 'var(--bg-card)' : 'transparent', padding: m.role === 'user' ? '8px 12px' : 0, borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', maxWidth: '85%' }}>
                            <MarkdownRenderer content={m.text} />
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Bot size={14} color="var(--text-accent)" className="spin-anim" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Council is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about your automation..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
                />
                <button
                    type="submit"
                    disabled={isThinking || !input.trim()}
                    style={{ background: 'var(--accent)', color: 'white', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed', opacity: input.trim() && !isThinking ? 1 : 0.5 }}
                >
                    <Send size={14} style={{ marginLeft: -2 }} />
                </button>
            </form>
        </div>
    );
}
