import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronDown, Crown, Search, FileText, Code, ImageIcon, Film, Zap, RefreshCw, Brain, Globe, Info, Download } from 'lucide-react';
import { useCouncil } from '../context/CouncilContext';
import MessageInput from '../components/MessageInput';
import CouncilPanel from '../components/CouncilPanel';
import CouncilLogo from '../components/CouncilLogo';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ReasoningTrace from '../components/ReasoningTrace';
import CanvasPanel from '../components/CanvasPanel';
import CodePanel from '../components/CodePanel';

const QUICK_PROMPTS = [
    'Compare the strengths of different programming paradigms',
    'Analyze the best approach to build a startup MVP',
    'Explain quantum computing in simple terms',
    'What are the key considerations for AI safety?',
];

const THINK_MODES = [
    { id: 'quick', label: 'Quick', icon: '⚡', desc: 'Single model, no council vote' },
    { id: 'default', label: 'Default', icon: null, desc: 'Full council with king election' },
    { id: 'deep', label: 'Deep Think', icon: null, desc: '2-round deliberation with review' },
    { id: 'deeper', label: 'Deeper Think', icon: null, desc: '3-round deliberation with synthesis' },
];

const SEARCH_MODES = [
    { id: 'none', label: 'No Search' },
    { id: 'search', label: 'Web Search' },
    { id: 'deep', label: 'Deep Search' },
];

export default function ChatView() {
    const navigate = useNavigate();
    const [isAutomationMode, setIsAutomationMode] = useState(false);
    const {
        activeConversation,
        sendMessage,
        isProcessing,
        processingPhase,
        enabledModels,
        textModels,
        imageModels,
        updateSystemPrompt,
        kingModelId,
        setKingModelId,
        synthesisMode,
        setSynthesisMode,
        generateImage,
        generateVideo,
        retryMessage,
    } = useCouncil();
    const messagesEndRef = useRef(null);
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [showKingSelector, setShowKingSelector] = useState(false);
    const [showSynthesisSelector, setShowSynthesisSelector] = useState(false);
    const [activePanel, setActivePanel] = useState(null);
    const [thinkMode, setThinkMode] = useState('default');
    const [searchMode, setSearchMode] = useState('none');
    const [showThinkMenu, setShowThinkMenu] = useState(false);
    const [showSearchMenu, setShowSearchMenu] = useState(false);
    const [mediaMode, setMediaMode] = useState(null); // 'image' or 'video' or null
    const [generationAttempts, setGenerationAttempts] = useState(1);
    const [excludedMediaModels, setExcludedMediaModels] = useState(new Set());
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [quality, setQuality] = useState('standard');
    const [duration, setDuration] = useState(5);

    const toggleMediaModel = (modelId) => {
        setExcludedMediaModels(prev => {
            const next = new Set(prev);
            if (next.has(modelId)) next.delete(modelId);
            else next.add(modelId);
            return next;
        });
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConversation?.messages]);

    const handleSend = (text, files, extraOpts = {}) => {
        if (isAutomationMode) {
            setIsAutomationMode(false);
            navigate('/automations', { state: { autoGeneratePrompt: text } });
            return;
        }
        if (mediaMode === 'image') {
            const selected = imageModels.filter(m => !excludedMediaModels.has(m.id));
            if (selected.length === 0) {
                alert("Please select at least one image model.");
                return;
            }
            generateImage(text, selected, generationAttempts, { aspectRatio, quality });
            setMediaMode(null);
            return;
        }
        if (mediaMode === 'video') {
            const allVideoModels = enabledModels.filter(m => m.type === 'video');
            const selected = allVideoModels.filter(m => !excludedMediaModels.has(m.id));
            if (selected.length === 0) {
                alert("Please select at least one video model.");
                return;
            }
            generateVideo(text, selected, generationAttempts, { aspectRatio, quality, duration });
            setMediaMode(null);
            return;
        }
        const opts = {
            thinkMode,
            searchMode: searchMode === 'search',
            deepSearch: searchMode === 'deep',
            canvasActive: activePanel === 'canvas',
            ...extraOpts,
        };
        sendMessage(text, files, opts);
    };

    const handleImageGen = async (prompt) => {
        if (!imageModels?.length) return;
        await generateImage(prompt);
    };

    const kingModel = textModels.find(m => m.id === kingModelId);
    const hasImageModels = imageModels?.length > 0;
    const hasVideoModels = enabledModels?.some(m => m.type === 'video');

    const togglePanel = (panel) => setActivePanel(prev => prev === panel ? null : panel);

    const activeThinkMode = THINK_MODES.find(m => m.id === thinkMode);
    const activeSearchMode = SEARCH_MODES.find(m => m.id === searchMode);

    const getProcessingLabel = () => {
        if (processingPhase === 'voting') return 'electing King...';
        if (processingPhase === 'searching') return 'searching the web...';
        if (processingPhase === 'deep searching') return 'deep searching (multiple queries)...';
        if (processingPhase === 'generating (quick)') return 'generating (quick mode)...';
        if (processingPhase === 'reviewing (round 2)') return 'reviewing responses (round 2)...';
        if (processingPhase === 'synthesizing (round 3)') return 'synthesizing final response (round 3)...';
        if (processingPhase === 'generating image') return 'generating image...';
        return 'generating responses...';
    };

    const getThinkBadge = (msg) => {
        if (!msg.thinkMode || msg.thinkMode === 'default') return null;
        const labels = {
            quick: { text: 'Quick', color: '#f59e0b' },
            deep: { text: 'Deep Think', color: '#8b5cf6' },
            deeper: { text: 'Deeper Think', color: '#ec4899' },
        };
        const l = labels[msg.thinkMode];
        if (!l) return null;
        return (
            <span className="badge" style={{ color: l.color, borderColor: `${l.color}40` }}>
                <Brain size={9} style={{ marginRight: 3 }} /> {l.text}
            </span>
        );
    };

    return (
        <div className="chat-view">
            <div className="chat-header">
                <span className="chat-header-title">
                    {activeConversation?.messages?.length > 0 ? activeConversation.title : 'New conversation'}
                </span>
                <div className="chat-header-models">
                    {/* King selector */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowKingSelector(!showKingSelector)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                border: `1px solid ${kingModel ? 'var(--accent)' : 'var(--border-default)'}`,
                                background: kingModel ? 'var(--accent-glow)' : 'transparent',
                                color: kingModel ? 'var(--text-accent)' : 'var(--text-muted)',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            }}
                        >
                            <Crown size={11} />
                            {kingModel ? kingModel.name : 'Auto (Council Vote)'}
                            <ChevronDown size={10} />
                        </button>
                        {showKingSelector && (
                            <div className="king-dropdown">
                                <button
                                    className={`king-option ${!kingModelId ? 'selected' : ''}`}
                                    onClick={() => { setKingModelId(null); setShowKingSelector(false); }}
                                >
                                    Auto (Council Vote)
                                </button>
                                {textModels.map(m => (
                                    <button
                                        key={m.id}
                                        className={`king-option ${kingModelId === m.id ? 'selected' : ''}`}
                                        onClick={() => { setKingModelId(m.id); setShowKingSelector(false); }}
                                    >
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block', marginRight: 6 }} />
                                        {m.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Synthesis Mode selector */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowSynthesisSelector(!showSynthesisSelector)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--border-default)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            }}
                        >
                            <Brain size={11} />
                            {synthesisMode === 'combine' ? 'Combine Mode' : 'Choice Mode'}
                            <ChevronDown size={10} />
                        </button>
                        {showSynthesisSelector && (
                            <div className="king-dropdown" style={{ minWidth: 260 }}>
                                <button
                                    className={`king-option ${synthesisMode === 'choice' ? 'selected' : ''}`}
                                    onClick={() => { setSynthesisMode('choice'); setShowSynthesisSelector(false); }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Choice Mode
                                            <div className="tooltip-trigger">
                                                <Info size={12} color="var(--text-muted)" />
                                                <div className="tooltip-content">The King exclusively outputs its own answer, selected as the best response.</div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    className={`king-option ${synthesisMode === 'combine' ? 'selected' : ''}`}
                                    onClick={() => { setSynthesisMode('combine'); setShowSynthesisSelector(false); }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Combine Mode
                                            <div className="tooltip-trigger">
                                                <Info size={12} color="var(--text-muted)" />
                                                <div className="tooltip-content">The King acts as an editor, taking all council responses and synthesizing them into a single definitive answer. (Requires an extra reasoning step!)</div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Model count */}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {textModels.length} model{textModels.length !== 1 ? 's' : ''} active
                    </span>
                </div>
            </div>

            {/* System prompt toggle */}
            <div className="system-prompt-bar">
                <button className="system-prompt-toggle" onClick={() => setShowSystemPrompt(!showSystemPrompt)}>
                    System Prompt
                    <ChevronDown size={12} style={{ transform: showSystemPrompt ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showSystemPrompt && (
                    <div className="system-prompt-editor">
                        <textarea
                            className="system-prompt-input"
                            value={activeConversation?.systemPrompt || ''}
                            onChange={(e) => updateSystemPrompt(e.target.value)}
                            placeholder="Set a system prompt to shape how all models respond..."
                            rows={3}
                        />
                    </div>
                )}
            </div>

            {/* Main area: chat + optional side panel */}
            <div className="chat-body">
                <div className="chat-messages-area">
                    <div className="chat-messages">
                        {(!activeConversation?.messages || activeConversation.messages.length === 0) && !isProcessing ? (
                            <div className="chat-empty">
                                <div className="chat-empty-icon"><CouncilLogo size={56} /></div>
                                <h2>Ask the Council</h2>
                                <p>
                                    Your question will be analyzed by {textModels.length > 0 ? textModels.length : 'multiple'} AI models.
                                    {textModels.length === 0 && ' Add models with API keys in Settings.'}
                                </p>
                                <div className="quick-prompts">
                                    {QUICK_PROMPTS.map((p, i) => (
                                        <button key={i} className="quick-prompt" onClick={() => handleSend(p, [])}>{p}</button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeConversation?.messages?.map(msg => (
                                    <div key={msg.id} className="message">
                                        <div className={`message-avatar ${msg.role}`}>
                                            {msg.role === 'user' ? <User size={14} /> : <CouncilLogo size={16} />}
                                        </div>
                                        <div className="message-content">
                                            <div className="message-sender">
                                                {msg.role === 'user' ? 'You' : 'Council'}
                                                {msg.role === 'council' && msg.kingModelId && (
                                                    <span className="badge" style={{ color: 'var(--text-accent)', borderColor: 'var(--border-accent)' }}>
                                                        <Crown size={9} style={{ marginRight: 3 }} />
                                                        {msg.responses?.find(r => r.isKing)?.modelName || 'King'}
                                                    </span>
                                                )}
                                                {msg.role === 'council' && msg.responses?.length > 0 && (
                                                    <span className="badge">{msg.responses.filter(r => !r.error).length} models</span>
                                                )}
                                                {msg.searchResults && (
                                                    <span className="badge" style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)' }}>
                                                        <Search size={9} style={{ marginRight: 3 }} />
                                                        {msg.deepSearchQueries ? `Deep Search (${msg.searchResults.length})` : 'Web Search'}
                                                    </span>
                                                )}
                                                {msg.role === 'council' && getThinkBadge(msg)}
                                            </div>

                                            {/* Markdown-rendered message */}
                                            <div className="message-text">
                                                <MarkdownRenderer content={msg.text} />
                                            </div>

                                            {/* Image preview */}
                                            {msg.imageUrl && (
                                                <div className="message-image">
                                                    <img src={msg.imageUrl} alt={msg.imagePrompt || 'Generated image'} />
                                                </div>
                                            )}

                                            {/* Video preview */}
                                            {msg.videoUrl && (
                                                <div className="message-video" style={{ marginTop: '12px', position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                                    <video
                                                        src={msg.videoUrl}
                                                        controls
                                                        preload="metadata"
                                                        style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: '400px', backgroundColor: '#000', border: '1px solid var(--border-subtle)', display: 'block' }}
                                                    />
                                                    <a
                                                        href={msg.videoUrl}
                                                        download="generated_video.mp4"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="video-download-overlay"
                                                        title="Download full resolution video"
                                                    >
                                                        <Download size={15} />
                                                    </a>
                                                </div>
                                            )}

                                            {msg.attachments?.length > 0 && (
                                                <div className="message-attachments">
                                                    {msg.attachments.map(a => (
                                                        <div key={a.id} className="attachment-chip">
                                                            {a.preview ? <img src={a.preview} alt="" /> : null}
                                                            <span>{a.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Reasoning trace (always shown for deep/deeper/deepSearch) */}
                                            {msg.role === 'council' && msg.reasoningTrace && (
                                                <ReasoningTrace trace={msg.reasoningTrace} />
                                            )}

                                            {msg.role === 'council' && msg.responses?.length > 0 && (
                                                <CouncilPanel responses={msg.responses} moderationText={msg.moderationText} consensusLog={msg.consensusLog} />
                                            )}
                                            {msg.role === 'council' && !isProcessing && (
                                                <div className="message-actions">
                                                    <button
                                                        className="retry-btn"
                                                        onClick={() => retryMessage(msg.id)}
                                                        title="Regenerate response"
                                                    >
                                                        <RefreshCw size={12} />
                                                        <span>Retry</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {isProcessing && (
                            <div className="message">
                                <div className="message-avatar council"><CouncilLogo size={16} /></div>
                                <div className="message-content">
                                    <div className="message-sender">
                                        Council
                                        <span className="badge">
                                            {getProcessingLabel()}
                                        </span>
                                    </div>
                                    <div className="loading-dots">
                                        <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Tool bar + Input */}
                    <div className="chat-input-area">
                        <div className="tool-bar">
                            {/* Think mode selector */}
                            <div className="mode-selector" style={{ position: 'relative' }}>
                                <button
                                    className={`tool-btn mode-btn ${thinkMode !== 'default' ? 'active' : ''}`}
                                    onClick={() => setShowThinkMenu(!showThinkMenu)}
                                    title={activeThinkMode?.desc}
                                >
                                    <Brain size={15} />
                                    <span>{activeThinkMode?.label}</span>
                                    <ChevronDown size={10} />
                                </button>
                                {showThinkMenu && (
                                    <div className="mode-dropdown">
                                        {THINK_MODES.map(m => (
                                            <button
                                                key={m.id}
                                                className={`mode-option ${thinkMode === m.id ? 'selected' : ''}`}
                                                onClick={() => { setThinkMode(m.id); setShowThinkMenu(false); }}
                                            >
                                                <span className="mode-option-label">{m.icon ? `${m.icon} ` : ''}{m.label}</span>
                                                <span className="mode-option-desc">{m.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search mode selector */}
                            <div className="mode-selector" style={{ position: 'relative' }}>
                                <button
                                    className={`tool-btn mode-btn ${searchMode !== 'none' ? 'active' : ''}`}
                                    onClick={() => setShowSearchMenu(!showSearchMenu)}
                                    title={searchMode === 'none' ? 'No search' : searchMode === 'search' ? 'Web Search' : 'Deep Search'}
                                >
                                    <Globe size={15} />
                                    <span>{activeSearchMode?.label}</span>
                                    <ChevronDown size={10} />
                                </button>
                                {showSearchMenu && (
                                    <div className="mode-dropdown">
                                        {SEARCH_MODES.map(m => (
                                            <button
                                                key={m.id}
                                                className={`mode-option ${searchMode === m.id ? 'selected' : ''}`}
                                                onClick={() => { setSearchMode(m.id); setShowSearchMenu(false); }}
                                            >
                                                <span className="mode-option-label">
                                                    {m.id === 'none' ? '—' : m.id === 'search' ? '🔍' : '🌐'} {m.label}
                                                </span>
                                                <span className="mode-option-desc">
                                                    {m.id === 'none' ? 'No web search' : m.id === 'search' ? '8 results from DuckDuckGo' : '50+ results, multi-query deep research'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="tool-divider" />

                            <button
                                className={`tool-btn ${activePanel === 'canvas' ? 'active' : ''}`}
                                onClick={() => togglePanel('canvas')}
                                title="Canvas / Document"
                            >
                                <FileText size={15} />
                                <span>Canvas</span>
                            </button>
                            <button
                                className={`tool-btn ${activePanel === 'code' ? 'active' : ''}`}
                                onClick={() => togglePanel('code')}
                                title="Code Editor"
                            >
                                <Code size={15} />
                                <span>Code</span>
                            </button>
                            <div className="tool-divider" />
                            <button
                                className={`tool-btn ${mediaMode === 'image' ? 'active' : ''} ${!hasImageModels ? 'disabled' : ''}`}
                                disabled={!hasImageModels}
                                onClick={() => setMediaMode(mediaMode === 'image' ? null : 'image')}
                                title={hasImageModels ? (mediaMode === 'image' ? 'Exit image mode' : 'Generate Image') : 'No image model active'}
                            >
                                <ImageIcon size={15} />
                                <span>Image</span>
                            </button>
                            <button
                                className={`tool-btn ${mediaMode === 'video' ? 'active' : ''} ${!hasVideoModels ? 'disabled' : ''}`}
                                disabled={!hasVideoModels}
                                onClick={() => setMediaMode(mediaMode === 'video' ? null : 'video')}
                                title={hasVideoModels ? (mediaMode === 'video' ? 'Exit video mode' : 'Generate Video') : 'No video model active'}
                            >
                                <Film size={15} />
                                <span>Video</span>
                            </button>
                            {mediaMode && (
                                <select
                                    className="mode-btn"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}
                                    value={generationAttempts}
                                    onChange={(e) => setGenerationAttempts(Number(e.target.value))}
                                    title="Number of generation attempts per active model"
                                >
                                    <option value={1}>1 Attempt</option>
                                    <option value={2}>2 Attempts</option>
                                    <option value={3}>3 Attempts</option>
                                    <option value={4}>4 Attempts</option>
                                </select>
                            )}
                            <div className="tool-divider" />
                            <button
                                className={`tool-btn ${isAutomationMode ? 'active' : ''}`}
                                onClick={() => setIsAutomationMode(!isAutomationMode)}
                                title="Generate Automation"
                            >
                                <Zap size={15} />
                                <span>Automate</span>
                            </button>
                        </div>

                        {mediaMode && (
                            <div className="search-mode-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        {mediaMode === 'image' ? <ImageIcon size={14} /> : <Film size={14} />}
                                        <span>{mediaMode === 'image' ? 'Image Generation Mode' : 'Video Generation Mode'}</span>
                                    </div>
                                    <button onClick={() => setMediaMode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }} title="Close">
                                        &times;
                                    </button>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Select the models you want to generate with. Deselected models will be skipped.
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                                        <select
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 6px', borderRadius: 4, fontSize: 11 }}
                                            value={generationAttempts}
                                            onChange={(e) => setGenerationAttempts(Number(e.target.value))}
                                            title="Number of variations per model"
                                        >
                                            <option value={1}>1 Attempt</option>
                                            <option value={2}>2 Attempts</option>
                                            <option value={3}>3 Attempts</option>
                                            <option value={4}>4 Attempts</option>
                                        </select>
                                        <select
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 6px', borderRadius: 4, fontSize: 11 }}
                                            value={aspectRatio}
                                            onChange={e => setAspectRatio(e.target.value)}
                                            title="Aspect Ratio"
                                        >
                                            <option value="16:9">16:9</option>
                                            <option value="1:1">1:1</option>
                                            <option value="9:16">9:16</option>
                                            <option value="4:3">4:3</option>
                                            <option value="3:4">3:4</option>
                                        </select>
                                        <select
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '4px 6px', borderRadius: 4, fontSize: 11 }}
                                            value={quality}
                                            onChange={e => setQuality(e.target.value)}
                                            title="Quality"
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="high">High</option>
                                            <option value="basic">Basic</option>
                                        </select>
                                        {mediaMode === 'video' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '2px 8px', height: '24px' }} title="Duration">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="30"
                                                    step="1"
                                                    value={duration}
                                                    onChange={e => setDuration(Number(e.target.value))}
                                                    style={{ width: '60px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: 11, color: 'var(--text-primary)', minWidth: '22px', userSelect: 'none' }}>{duration}s</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)', marginRight: '4px' }}></div>
                                    {(mediaMode === 'image' ? imageModels : enabledModels.filter(m => m.type === 'video')).map(m => {
                                        const isExcluded = excludedMediaModels.has(m.id);
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => toggleMediaModel(m.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${isExcluded ? 'var(--border-subtle)' : m.color}`,
                                                    background: isExcluded ? 'transparent' : `${m.color}15`,
                                                    color: isExcluded ? 'var(--text-muted)' : 'var(--text-primary)',
                                                    fontSize: '12px',
                                                    fontWeight: isExcluded ? 400 : 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    opacity: isExcluded ? 0.5 : 1
                                                }}
                                                title={isExcluded ? 'Click to enable' : 'Click to disable'}
                                            >
                                                {m.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {searchMode !== 'none' && (
                            <div className={`search-mode-banner ${searchMode === 'deep' ? 'deep' : ''}`}>
                                {searchMode === 'deep' ? <Globe size={13} /> : <Search size={13} />}
                                <span>
                                    {searchMode === 'deep'
                                        ? 'Deep Search active — multiple queries will search 50+ sources in real-time'
                                        : 'Web Search active — your prompt will be searched online first'}
                                </span>
                                <button onClick={() => setSearchMode('none')}>&times;</button>
                            </div>
                        )}

                        <MessageInput
                            onSend={handleSend}
                            disabled={isProcessing}
                            placeholder={isAutomationMode ? "Describe your automation in natural language, the Council will handle it..." : mediaMode ? `Describe the ${mediaMode} you want to generate...` : 'Ask the council anything...'}
                        />
                    </div>
                </div>

                {/* Side panels */}
                {activePanel === 'canvas' && (() => {
                    const canvasMsg = activeConversation?.messages?.findLast(m => m.role === 'council' && m.canvasContent);
                    return (
                        <CanvasPanel
                            onClose={() => setActivePanel(null)}
                            onSendToCouncil={(doc) => handleSend(`Review this document:\n\n${doc}`, [])}
                            incomingContent={canvasMsg?.canvasContent || null}
                            incomingId={canvasMsg?.id || null}
                        />
                    );
                })()}
                {activePanel === 'code' && (
                    <CodePanel
                        onClose={() => setActivePanel(null)}
                        onSendToCouncil={(code, lang) => handleSend(`Review this ${lang} code:\n\n\`\`\`${lang}\n${code}\n\`\`\``, [])}
                    />
                )}
            </div>
        </div>
    );
}
