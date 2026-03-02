import { useState, useRef, useEffect } from 'react';
import { useStudy } from '../../context/StudyContext';
import { useCouncil } from '../../context/CouncilContext';
import { Send, Bot, User, Brain, BookOpen, Layers, CheckSquare, Loader2, Crown, ChevronDown, Search, Globe, ImageIcon, Film, FileText, Code, Info, ChevronLeft, ChevronRight, RefreshCw, Grid, Maximize, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MarkdownRenderer from '../MarkdownRenderer';
import MessageInput from '../MessageInput';
import CouncilPanel from '../CouncilPanel';
import CouncilLogo from '../CouncilLogo';
import ReasoningTrace from '../ReasoningTrace';
import ReactFlowMindmap from './ReactFlowMindmap';
import ArtifactHistory from './ArtifactHistory';

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

const API_BASE = 'http://localhost:3001/api';

export default function StudyMainArea() {
    const { activeNotebook, updateNotebook } = useStudy();
    const {
        textModels, kingModelId, setKingModelId, synthesisMode, setSynthesisMode,
        sendMessage, isProcessing, processingPhase, conversations, activeConversationId, setActiveConversationId, createConversation
    } = useCouncil();

    const [activeTab, setActiveTab] = useState('chat');
    const [thinkMode, setThinkMode] = useState('default');
    const [searchMode, setSearchMode] = useState('none');

    const [showKingSelector, setShowKingSelector] = useState(false);
    const [showSynthesisSelector, setShowSynthesisSelector] = useState(false);
    const [showThinkMenu, setShowThinkMenu] = useState(false);
    const [showSearchMenu, setShowSearchMenu] = useState(false);

    // Custom artifact prompts
    const [mindmapPrompt, setMindmapPrompt] = useState('');
    const [activeMindmapId, setActiveMindmapId] = useState(null);
    const [flashcardsPrompt, setFlashcardsPrompt] = useState('');
    const [flashcardCount, setFlashcardCount] = useState(10);
    const [activeFlashcardSetId, setActiveFlashcardSetId] = useState(null);
    const [flashcardViewMode, setFlashcardViewMode] = useState('single');
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
    const [quizPrompt, setQuizPrompt] = useState('');

    // Quiz Interactive State
    const [quizLength, setQuizLength] = useState(5);
    const [quizDifficulty, setQuizDifficulty] = useState('Intermediate');
    const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
    const [quizSelectedOption, setQuizSelectedOption] = useState(null);
    const [quizHasConfirmed, setQuizHasConfirmed] = useState(false);
    const [activeQuizId, setActiveQuizId] = useState(null);

    const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
    const [input, setInput] = useState('');
    const chatScrollRef = useRef(null);

    // Ensure the Notebook has a dedicated Council Conversation
    useEffect(() => {
        if (!activeNotebook) return;

        const existingConv = conversations.find(c => c.id === activeNotebook.studyChatId);

        if (!activeNotebook.studyChatId || (!existingConv && activeNotebook.studyChatId)) {
            // Either no chat ID yet, or the ID exists in the DB but got wiped from local sessionStorage
            const sid = createConversation('study-' + activeNotebook.id, activeNotebook.systemPrompt);
            updateNotebook(activeNotebook.id, { studyChatId: sid });
            setActiveConversationId(sid);
        } else if (activeConversationId !== activeNotebook.studyChatId) {
            setActiveConversationId(activeNotebook.studyChatId);
        }
    }, [activeNotebook, activeConversationId, createConversation, setActiveConversationId, updateNotebook, conversations]);

    const activeConversation = conversations.find(c => c.id === activeNotebook?.studyChatId);

    const scrollToBottom = () => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({
                top: chatScrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(scrollToBottom, [activeConversation?.messages]);

    const getSourcesContext = () => {
        return activeNotebook.sources.map((s, i) => `--- SOURCE ${i + 1}: ${s.name} ---\n${s.text}`).join('\n\n');
    };

    const handleSend = async (text, attachments = [], extraOpts = {}) => {
        if (!text.trim() && !attachments.length) return;

        const textToSend = text.trim();

        // Convert sources into pseudo-files to use the Council's attachment document reading logic
        const sourceAttachments = activeNotebook.sources.map(s => {
            const blob = new Blob([s.text], { type: 'text/plain' });
            return {
                id: s.id,
                name: s.name + '.txt',
                type: 'text/plain',
                file: new File([blob], s.name + '.txt', { type: 'text/plain' })
            };
        });

        // Add user attachments if any
        const allAttachments = [...attachments, ...sourceAttachments];

        const opts = {
            thinkMode,
            searchMode: searchMode === 'search',
            deepSearch: searchMode === 'deep',
            canvasActive: false,
            ...extraOpts
        };

        sendMessage(textToSend, allAttachments, opts);
    };

    const kingModel = textModels.find(m => m.id === kingModelId);

    const callAI = async (systemPrompt, userPrompt) => {
        // Fallback simple runner for artifacts. Iterates through all text models for fault tolerance.
        const startModel = textModels.find(m => m.id === kingModelId) || textModels[0];
        if (!startModel) throw new Error("No active text models available.");

        // Create an ordered list of models to try (King first, then the rest)
        const modelsToTry = [startModel, ...textModels.filter(m => m.id !== startModel.id)];
        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const res = await fetch(`${API_BASE}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey: model.apiKey,
                        baseUrl: model.baseUrl,
                        modelSlug: model.slug,
                        messages: [{ role: 'user', content: userPrompt }],
                        systemPrompt,
                        temperature: 0.7,
                        images: [],
                    }),
                });

                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    const serverError = data?.error || `HTTP Error ${res.status}`;
                    throw new Error(serverError);
                }
                return data.content; // Return the first successful result
            } catch (err) {
                console.warn(`[Study Artifact] Model ${model.name} failed:`, err.message);
                lastError = err;
            }
        }

        // If all models somehow exhausted their limits
        throw new Error(`All available Council models failed to generate the artifact. Last error: ${lastError?.message}`);
    };

    const generateMindmap = async () => {
        if (!activeNotebook || activeNotebook.sources.length === 0) {
            alert("Please add sources first.");
            return;
        }
        setIsGeneratingArtifact('mindmap');
        try {
            const userAddition = mindmapPrompt.trim() ? `\n\nUSER SPECIFIC INSTRUCTIONS:\n${mindmapPrompt}\n` : '';
            const prompt = `Based on the following sources, generate a detailed mindmap summarizing the key concepts, themes, and their relationships. ONLY output a raw JSON object with two arrays: "nodes" and "edges".
Nodes must have: { "id": "unique_string", "data": { "label": "Concept Name" } }
Edges must have: { "id": "e_source_target", "source": "source_node_id", "target": "target_node_id" }
Ensure it is a connected graph starting from a central root node. Do NOT wrap in markdown formatting.${userAddition}\nSources:\n${getSourcesContext()}`;
            const result = await callAI("You are an expert at creating structured JSON graph data for mindmaps.", prompt);

            let cleaned = result.trim();
            if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
            const mindmapJson = JSON.parse(cleaned);

            const newMindmap = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                prompt: mindmapPrompt,
                data: mindmapJson
            };

            const currentMindmaps = activeNotebook.mindmaps || [];
            updateNotebook(activeNotebook.id, { mindmaps: [newMindmap, ...currentMindmaps] });
            setActiveMindmapId(newMindmap.id);
        } catch (e) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsGeneratingArtifact(false);
        }
    };

    const generateFlashcards = async () => {
        if (!activeNotebook || activeNotebook.sources.length === 0) {
            alert("Please add sources first.");
            return;
        }
        setIsGeneratingArtifact('flashcards');

        try {
            const userAddition = flashcardsPrompt.trim() ? `\n\nUSER SPECIFIC INSTRUCTIONS:\n${flashcardsPrompt}\n` : '';
            const prompt = `Based on the following sources, generate ${flashcardCount} flashcards for studying. Output ONLY a raw JSON array of objects with "q" (question) and "a" (answer) keys. Example: [{"q": "What is X?", "a": "Y"}]. Do NOT wrap it in markdown formatting, just raw JSON.${userAddition}\nSources:\n${getSourcesContext()}`;
            let result = await callAI("You are an expert tutor creating study flashcards.", prompt);
            // Clean markdown if present
            if (result.startsWith('\`\`\`json')) result = result.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
            const cards = JSON.parse(result);

            const newSet = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                prompt: flashcardsPrompt,
                count: flashcardCount,
                data: cards
            };

            const currentSets = activeNotebook.flashcardSets || [];
            updateNotebook(activeNotebook.id, { flashcardSets: [newSet, ...currentSets] });

            setActiveFlashcardSetId(newSet.id);
            setCurrentFlashcardIndex(0);
            setIsFlashcardFlipped(false);
            setFlashcardViewMode('single');
        } catch (e) {
            alert(`Error generating flashcards: ${e.message}`);
        } finally {
            setIsGeneratingArtifact(false);
        }
    };

    const generateQuiz = async () => {
        if (!activeNotebook || activeNotebook.sources.length === 0) {
            alert("Please add sources first.");
            return;
        }
        setIsGeneratingArtifact('quiz');

        // Reset interactive state
        setCurrentQuizQuestion(0);
        setQuizSelectedOption(null);
        setQuizHasConfirmed(false);

        try {
            const userAddition = quizPrompt.trim() ? `\n\nUSER SPECIFIC INSTRUCTIONS:\n${quizPrompt}\n` : '';
            const prompt = `Based on the following sources, generate a ${quizLength}-question multiple choice quiz. Challenge Level/Difficulty: ${quizDifficulty}. Output ONLY a raw JSON array of objects with "q" (question), "options" (array of exactly 4 strings), and "answer" (the correct string matching one of the options exactly). Do NOT wrap it in markdown format.${userAddition}\nSources:\n${getSourcesContext()}`;
            let result = await callAI(`You are an expert exam creator generating a ${quizDifficulty} quiz.`, prompt);
            // Clean markdown
            if (result.startsWith('\`\`\`json')) result = result.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
            const quiz = JSON.parse(result);

            const newQuiz = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                length: quizLength,
                difficulty: quizDifficulty,
                questions: quiz
            };
            const existingQuizzes = activeNotebook.quizzes || [];
            updateNotebook(activeNotebook.id, { quizzes: [newQuiz, ...existingQuizzes] });
            setActiveQuizId(newQuiz.id);
        } catch (e) {
            alert(`Error generating quiz: ${e.message}`);
        } finally {
            setIsGeneratingArtifact(false);
        }
    };

    const handleRenameArtifact = (type, id, newName) => {
        if (!activeNotebook) return;
        const key = type === 'mindmap' ? 'mindmaps' : type === 'quiz' ? 'quizzes' : 'flashcardSets';
        const items = activeNotebook[key] || [];
        const updated = items.map(item => item.id === id ? { ...item, name: newName } : item);
        updateNotebook(activeNotebook.id, { [key]: updated });
    };

    const handleDeleteArtifact = (type, id) => {
        if (!activeNotebook) return;
        const key = type === 'mindmap' ? 'mindmaps' : type === 'quiz' ? 'quizzes' : 'flashcardSets';
        const items = activeNotebook[key] || [];
        const updated = items.filter(item => item.id !== id);
        updateNotebook(activeNotebook.id, { [key]: updated });

        // Return to history if active item deleted
        if (type === 'mindmap' && activeMindmapId === id) setActiveMindmapId(null);
        if (type === 'quiz' && activeQuizId === id) setActiveQuizId(null);
        if (type === 'flashcard' && activeFlashcardSetId === id) setActiveFlashcardSetId(null);
    };

    const handleQuizConfirm = () => {
        if (quizSelectedOption) {
            setQuizHasConfirmed(true);
        }
    };

    const handleQuizNext = () => {
        setCurrentQuizQuestion(prev => prev + 1);
        setQuizSelectedOption(null);
        setQuizHasConfirmed(false);
    };

    const handleAskCouncil = (questionObj) => {
        const query = `Regarding this quiz question from my notes:\n\n**Question:** ${questionObj.q}\n**Correct Answer:** ${questionObj.answer}\n**I selected:** ${quizSelectedOption}\n\nCould the Council please explain why the correct answer is right and why my specific choice is incorrect? Break it down clearly.`;

        // Switch to Chat tab
        setActiveTab('chat');
        // Force 'default' council mode so the Council discusses it
        setThinkMode('default');

        // Send the message
        sendMessage(query, []);
    };

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

    if (!activeNotebook) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>No active notebook</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
            <div className="study-header-mac" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', paddingRight: '20px' }}>
                <div style={{ display: 'flex' }}>
                    <button
                        className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                        style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'chat' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
                    >
                        <BookOpen size={16} /> Study Chat
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mindmap')}
                        style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'mindmap' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeTab === 'mindmap' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
                    >
                        <Layers size={16} /> Mindmap
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
                        onClick={() => setActiveTab('flashcards')}
                        style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'flashcards' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeTab === 'flashcards' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
                    >
                        <Brain size={16} /> Flashcards
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
                        onClick={() => setActiveTab('quiz')}
                        style={{ padding: '15px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'quiz' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeTab === 'quiz' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
                    >
                        <CheckSquare size={16} /> Quiz
                    </button>
                </div>
                {activeTab === 'chat' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
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
                                <div className="king-dropdown" style={{ minWidth: 260, right: 0, left: 'auto' }}>
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
                                                    <div className="tooltip-content">The King acts as an editor, taking all council responses and synthesizing them into a single definitive answer.</div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="chat-body" style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}>
                {activeTab === 'chat' && (
                    <div className="chat-messages-area">
                        <div className="chat-messages" ref={chatScrollRef}>
                            {(!activeConversation?.messages || activeConversation.messages.length === 0) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                    <CouncilLogo size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
                                    <h2>Study Assistant</h2>
                                    <p>Ask questions about your {activeNotebook.sources?.length || 0} uploaded sources.</p>
                                </div>
                            ) : (
                                activeConversation.messages.map((m, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', backgroundColor: (m.role === 'assistant' || m.role === 'council') ? 'var(--bg-secondary)' : 'transparent', borderRadius: '8px' }}>
                                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                            {m.role === 'user' ? <User size={18} color="var(--accent)" /> : <CouncilLogo size={18} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <MarkdownRenderer content={m.text} />
                                        </div>
                                    </div>
                                ))
                            )}

                            {isProcessing && (
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                        <CouncilLogo size={18} className="spin-anim" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Council
                                            <span style={{ backgroundColor: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                                {getProcessingLabel()}
                                            </span>
                                        </div>
                                        <div className="loading-dots" style={{ marginTop: '8px' }}>
                                            <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="chat-input-area">
                            <MessageInput
                                onSend={handleSend}
                                disabled={isProcessing}
                                placeholder="Ask about your sources..."
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'mindmap' && (() => {
                    const hasMindmaps = activeNotebook.mindmaps && activeNotebook.mindmaps.length > 0;
                    const legacyMindmap = activeNotebook.mindmapData && !hasMindmaps;
                    const showSetup = activeMindmapId === 'new' || (!hasMindmaps && !legacyMindmap);
                    const showHistory = activeMindmapId === null && (hasMindmaps || legacyMindmap);

                    let activeMindmap = null;
                    if (activeMindmapId && activeMindmapId !== 'new') {
                        if (activeMindmapId === 'legacy') {
                            activeMindmap = { id: 'legacy', data: activeNotebook.mindmapData, timestamp: new Date().toISOString(), prompt: '' };
                        } else {
                            activeMindmap = activeNotebook.mindmaps?.find(m => m.id === activeMindmapId);
                        }
                    }

                    return (
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                            {showSetup && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                                    <Layers size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Concept Mindmap</h2>
                                    <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '20px' }}>
                                        Generate an interactive mindmap mapping out the core concepts and connections found within your sources.
                                    </p>
                                    <textarea
                                        className="input-field"
                                        placeholder="Optional: Add specific guidelines or focus topics..."
                                        style={{ width: '100%', maxWidth: '400px', minHeight: '60px', marginBottom: '20px', resize: 'vertical', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', outline: 'none' }}
                                        value={mindmapPrompt}
                                        onChange={(e) => setMindmapPrompt(e.target.value)}
                                        disabled={isGeneratingArtifact !== false}
                                    />
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        {(hasMindmaps || legacyMindmap) && (
                                            <button className="btn secondary" onClick={() => setActiveMindmapId(null)} disabled={isGeneratingArtifact !== false}>
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            className="btn"
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isGeneratingArtifact !== false ? 0.6 : 1 }}
                                            onClick={generateMindmap}
                                            disabled={isGeneratingArtifact !== false}
                                        >
                                            {isGeneratingArtifact === 'mindmap' ? <><Loader2 size={16} className="spin" /> Generating...</> : "Generate Mindmap"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showHistory && (
                                <ArtifactHistory
                                    type="mindmap"
                                    items={legacyMindmap ? [{ id: 'legacy', name: 'Legacy Mindmap', timestamp: new Date().toISOString() }, ...(activeNotebook.mindmaps || [])] : activeNotebook.mindmaps}
                                    onSelect={(id) => setActiveMindmapId(id)}
                                    onDelete={(id) => handleDeleteArtifact('mindmap', id)}
                                    onRename={(id, name) => handleRenameArtifact('mindmap', id, name)}
                                    onCreateNew={() => setActiveMindmapId('new')}
                                    icon={Layers}
                                />
                            )}

                            {activeMindmap && (
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                        <div>
                                            <button className="btn secondary" onClick={() => setActiveMindmapId(null)} style={{ border: 'none', padding: '5px 10px', background: 'transparent' }}>
                                                ← Back to History
                                            </button>
                                        </div>
                                        <h2 style={{ margin: 0 }}>Active Mindmap</h2>
                                        <button className="btn secondary" onClick={() => setActiveMindmapId('new')} disabled={isGeneratingArtifact !== false}>
                                            New Mindmap
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                                        <ReactFlowMindmap mindmapData={activeMindmap.data} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {activeTab === 'flashcards' && (() => {
                    const hasSets = activeNotebook.flashcardSets && activeNotebook.flashcardSets.length > 0;
                    const legacyCards = activeNotebook.flashcardsData && !hasSets;
                    const showSetup = activeFlashcardSetId === 'new' || (!hasSets && !legacyCards);
                    const showHistory = activeFlashcardSetId === null && (hasSets || legacyCards);

                    let activeSet = null;
                    if (activeFlashcardSetId && activeFlashcardSetId !== 'new') {
                        if (activeFlashcardSetId === 'legacy') {
                            activeSet = { id: 'legacy', data: activeNotebook.flashcardsData, timestamp: new Date().toISOString() };
                        } else {
                            activeSet = activeNotebook.flashcardSets?.find(s => s.id === activeFlashcardSetId);
                        }
                    }

                    return (
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                            {showSetup && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                                    <Brain size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Study Flashcards</h2>
                                    <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '20px' }}>
                                        Automatically create flashcards to memorize key terms, definitions, and facts from your uploaded materials.
                                    </p>
                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', width: '100%', maxWidth: '400px' }}>
                                        <select
                                            value={flashcardCount}
                                            onChange={e => setFlashcardCount(Number(e.target.value))}
                                            className="input-field"
                                            style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                                            disabled={isGeneratingArtifact !== false}
                                        >
                                            <option value={5}>5 Flashcards</option>
                                            <option value={10}>10 Flashcards</option>
                                            <option value={15}>15 Flashcards</option>
                                            <option value={20}>20 Flashcards</option>
                                        </select>
                                    </div>
                                    <textarea
                                        className="input-field"
                                        placeholder="Optional: Provide specific topics or question types..."
                                        style={{ width: '100%', maxWidth: '400px', minHeight: '60px', marginBottom: '20px', resize: 'vertical', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', outline: 'none' }}
                                        value={flashcardsPrompt}
                                        onChange={(e) => setFlashcardsPrompt(e.target.value)}
                                        disabled={isGeneratingArtifact !== false}
                                    />
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        {(hasSets || legacyCards) && (
                                            <button className="btn secondary" onClick={() => setActiveFlashcardSetId(null)} disabled={isGeneratingArtifact !== false}>
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            className="btn"
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isGeneratingArtifact !== false ? 0.6 : 1 }}
                                            onClick={generateFlashcards}
                                            disabled={isGeneratingArtifact !== false}
                                        >
                                            {isGeneratingArtifact === 'flashcards' ? <><Loader2 size={16} className="spin" /> Generating...</> : "Generate Flashcards"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showHistory && (
                                <ArtifactHistory
                                    type="flashcard"
                                    items={legacyCards ? [{ id: 'legacy', name: 'Legacy Flashcards', timestamp: new Date().toISOString() }, ...(activeNotebook.flashcardSets || [])] : activeNotebook.flashcardSets}
                                    onSelect={(id) => { setActiveFlashcardSetId(id); setCurrentFlashcardIndex(0); setIsFlashcardFlipped(false); setFlashcardViewMode('single'); }}
                                    onDelete={(id) => handleDeleteArtifact('flashcard', id)}
                                    onRename={(id, name) => handleRenameArtifact('flashcard', id, name)}
                                    onCreateNew={() => setActiveFlashcardSetId('new')}
                                    icon={Brain}
                                />
                            )}

                            {activeSet && (
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                        <div>
                                            <button className="btn secondary" onClick={() => setActiveFlashcardSetId(null)} style={{ border: 'none', padding: '5px 10px', background: 'transparent' }}>
                                                ← Back to History
                                            </button>
                                        </div>
                                        <h2 style={{ margin: 0 }}>Flashcards ({activeSet.data.length})</h2>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className={`btn secondary ${flashcardViewMode === 'single' ? 'active-view' : ''}`} onClick={() => setFlashcardViewMode('single')} style={{ borderColor: flashcardViewMode === 'single' ? 'var(--accent)' : 'var(--border-default)' }}>
                                                <Maximize size={16} /> Single
                                            </button>
                                            <button className={`btn secondary ${flashcardViewMode === 'grid' ? 'active-view' : ''}`} onClick={() => setFlashcardViewMode('grid')} style={{ borderColor: flashcardViewMode === 'grid' ? 'var(--accent)' : 'var(--border-default)' }}>
                                                <Grid size={16} /> Grid
                                            </button>
                                            <button className="btn secondary" onClick={generateFlashcards} disabled={isGeneratingArtifact !== false} style={{ marginLeft: '10px' }}>
                                                {isGeneratingArtifact === 'flashcards' ? "Regenerating..." : "Regenerate"}
                                            </button>
                                        </div>
                                    </div>

                                    {flashcardViewMode === 'single' ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                                            <div style={{ perspective: '1000px', width: '100%', maxWidth: '700px', height: '400px', marginBottom: '40px' }}>
                                                <div style={{
                                                    width: '100%', height: '100%', position: 'relative', transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)', transformStyle: 'preserve-3d',
                                                    transform: isFlashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                                    boxShadow: 'var(--shadow-lg)'
                                                }}>
                                                    {/* Front */}
                                                    <div style={{
                                                        position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                                                        backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-default)',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px'
                                                    }}>
                                                        <div style={{ position: 'absolute', top: '25px', left: '25px', fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                            Card {currentFlashcardIndex + 1} of {activeSet.data.length}
                                                        </div>
                                                        <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.5 }}>
                                                            {activeSet.data[currentFlashcardIndex].q}
                                                        </div>
                                                        <button className="btn secondary" style={{ position: 'absolute', bottom: '30px' }} onClick={() => setIsFlashcardFlipped(true)}>
                                                            <RefreshCw size={18} /> Reveal Answer
                                                        </button>
                                                    </div>
                                                    {/* Back */}
                                                    <div style={{
                                                        position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                                                        backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', border: '1px solid var(--accent)',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px',
                                                        transform: 'rotateY(180deg)'
                                                    }}>
                                                        <div style={{ position: 'absolute', top: '25px', left: '25px', fontSize: '15px', color: 'var(--accent)', fontWeight: 600 }}>
                                                            Answer
                                                        </div>
                                                        <div style={{ fontSize: '22px', color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.6, overflowY: 'auto' }}>
                                                            {activeSet.data[currentFlashcardIndex].a}
                                                        </div>
                                                        <div style={{ position: 'absolute', bottom: '30px', display: 'flex', gap: '15px' }}>
                                                            <button className="btn secondary" onClick={() => setIsFlashcardFlipped(false)}>
                                                                <RefreshCw size={18} /> View Question
                                                            </button>
                                                            <button className="btn" onClick={() => {
                                                                const query = `Regarding this flashcard from my materials:\n\n**Question:** ${activeSet.data[currentFlashcardIndex].q}\n**Answer:** ${activeSet.data[currentFlashcardIndex].a}\n\nCould the Council explain this concept in more depth to help me understand it fully?`;
                                                                setActiveTab('chat');
                                                                setThinkMode('default');
                                                                setInput(query);
                                                                sendMessage(query, []);
                                                            }} style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                                                                <CouncilLogo size={16} /> Ask Council
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                                                <button
                                                    className="btn secondary"
                                                    disabled={currentFlashcardIndex === 0}
                                                    onClick={() => { setCurrentFlashcardIndex(prev => prev - 1); setIsFlashcardFlipped(false); }}
                                                    style={{ padding: '14px', borderRadius: '50%' }}
                                                >
                                                    <ChevronLeft size={24} />
                                                </button>
                                                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                    {currentFlashcardIndex + 1} / {activeSet.data.length}
                                                </span>
                                                <button
                                                    className="btn secondary"
                                                    disabled={currentFlashcardIndex === activeSet.data.length - 1}
                                                    onClick={() => { setCurrentFlashcardIndex(prev => prev + 1); setIsFlashcardFlipped(false); }}
                                                    style={{ padding: '14px', borderRadius: '50%' }}
                                                >
                                                    <ChevronRight size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <DragDropContext onDragEnd={(result) => {
                                            if (!result.destination || activeFlashcardSetId === 'legacy') return;
                                            const items = Array.from(activeSet.data);
                                            const [reorderedItem] = items.splice(result.source.index, 1);
                                            items.splice(result.destination.index, 0, reorderedItem);

                                            const updatedSets = activeNotebook.flashcardSets.map(s =>
                                                s.id === activeFlashcardSetId ? { ...s, data: items } : s
                                            );
                                            updateNotebook(activeNotebook.id, { flashcardSets: updatedSets });
                                        }}>
                                            <Droppable droppableId="flashcards-grid" direction="both">
                                                {(provided) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', paddingBottom: '20px' }}
                                                    >
                                                        {activeSet.data.map((card, idx) => (
                                                            <Draggable key={`fc-${idx}`} draggableId={`fc-${idx}`} index={idx}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={{
                                                                            backgroundColor: 'var(--bg-secondary)',
                                                                            padding: '25px',
                                                                            borderRadius: '12px',
                                                                            border: snapshot.isDragging ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                                                                            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'none',
                                                                            display: 'flex', flexDirection: 'column', gap: '15px',
                                                                            ...provided.draggableProps.style
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Card {idx + 1}</div>
                                                                            {activeFlashcardSetId !== 'legacy' && (
                                                                                <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
                                                                                    <GripVertical size={18} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 500, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                                                                            {card.q}
                                                                        </div>
                                                                        <button
                                                                            className="btn secondary"
                                                                            style={{ width: '100%', marginTop: 'auto' }}
                                                                            onClick={() => {
                                                                                setCurrentFlashcardIndex(idx);
                                                                                setIsFlashcardFlipped(false);
                                                                                setFlashcardViewMode('single');
                                                                            }}
                                                                        >
                                                                            View Card
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {activeTab === 'quiz' && (() => {
                    const hasQuizzes = (activeNotebook.quizzes && activeNotebook.quizzes.length > 0) || activeNotebook.quizData;
                    const showSetup = activeQuizId === 'new' || !hasQuizzes;
                    const showHistory = activeQuizId === null && hasQuizzes;

                    let activeQuiz = null;
                    if (activeQuizId && activeQuizId !== 'new') {
                        if (activeQuizId === 'legacy') {
                            activeQuiz = { id: 'legacy', questions: activeNotebook.quizData, length: activeNotebook.quizData.length, difficulty: 'Mixed', timestamp: new Date().toISOString() };
                        } else {
                            activeQuiz = activeNotebook.quizzes?.find(q => q.id === activeQuizId);
                        }
                    }

                    return (
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                            {showSetup && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                                    <CheckSquare size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Knowledge Quiz</h2>
                                    <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '20px' }}>
                                        Test your understanding with a multiple-choice quiz generated dynamically from your source documents.
                                    </p>
                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', width: '100%', maxWidth: '400px' }}>
                                        <select
                                            value={quizLength}
                                            onChange={e => setQuizLength(Number(e.target.value))}
                                            className="input-field"
                                            style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                                            disabled={isGeneratingArtifact !== false}
                                        >
                                            <option value={5}>Short (5 Questions)</option>
                                            <option value={10}>Medium (10 Questions)</option>
                                            <option value={20}>Long (20 Questions)</option>
                                        </select>
                                        <select
                                            value={quizDifficulty}
                                            onChange={e => setQuizDifficulty(e.target.value)}
                                            className="input-field"
                                            style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                                            disabled={isGeneratingArtifact !== false}
                                        >
                                            <option value="Easy">Easy</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Difficult">Difficult</option>
                                        </select>
                                    </div>
                                    <textarea
                                        className="input-field"
                                        placeholder="Optional: Provide specific topics or rules..."
                                        style={{ width: '100%', maxWidth: '400px', minHeight: '60px', marginBottom: '20px', resize: 'vertical', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', padding: '10px 14px', outline: 'none' }}
                                        value={quizPrompt}
                                        onChange={(e) => setQuizPrompt(e.target.value)}
                                        disabled={isGeneratingArtifact !== false}
                                    />
                                    <button
                                        className="btn"
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isGeneratingArtifact !== false ? 0.6 : 1 }}
                                        onClick={generateQuiz}
                                        disabled={isGeneratingArtifact !== false}
                                    >
                                        {isGeneratingArtifact === 'quiz' ? <><Loader2 size={16} className="spin" /> Generating...</> : "Generate Quiz"}
                                    </button>
                                    {hasQuizzes && (
                                        <button className="btn secondary" onClick={() => setActiveQuizId(null)} style={{ marginTop: '20px' }}>
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            )}

                            {showHistory && (
                                <ArtifactHistory
                                    type="quiz"
                                    items={activeNotebook.quizData ? [{ id: 'legacy', name: 'Legacy Quiz', timestamp: new Date().toISOString(), length: activeNotebook.quizData.length, difficulty: 'Mixed' }, ...(activeNotebook.quizzes || [])] : activeNotebook.quizzes}
                                    onSelect={(id) => {
                                        if (id === 'legacy') {
                                            // Handling for legacy structure if different, or just map it
                                            setActiveQuizId('legacy');
                                        } else {
                                            setActiveQuizId(id);
                                        }
                                        setCurrentQuizQuestion(0);
                                        setQuizSelectedOption(null);
                                        setQuizHasConfirmed(false);
                                    }}
                                    onDelete={(id) => handleDeleteArtifact('quiz', id)}
                                    onRename={(id, name) => handleRenameArtifact('quiz', id, name)}
                                    onCreateNew={() => setActiveQuizId('new')}
                                    icon={CheckSquare}
                                />
                            )}

                            {activeQuiz && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                        <h2 style={{ margin: 0 }}>Quiz ({activeQuiz.length} questions)</h2>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn secondary" onClick={() => setActiveQuizId(null)}>
                                                Back to History
                                            </button>
                                            <button className="btn secondary" onClick={generateQuiz} disabled={isGeneratingArtifact !== false}>
                                                {isGeneratingArtifact === 'quiz' ? "Regenerating..." : "Regenerate"}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Optional: Refine the quiz focus, length, or difficulty..."
                                            value={quizPrompt}
                                            onChange={e => setQuizPrompt(e.target.value)}
                                            disabled={isGeneratingArtifact !== false}
                                            style={{ width: '100%', fontSize: '13px', padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px 0' }}>
                                        {currentQuizQuestion < activeQuiz.questions.length ? (
                                            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '40px', borderRadius: '12px', border: '1px solid var(--border-default)', maxWidth: '800px', margin: '0 auto', width: '100%', boxShadow: 'var(--shadow-md)' }}>
                                                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Question {currentQuizQuestion + 1} of {activeQuiz.length}</span>
                                                    <span style={{ color: 'var(--accent)' }}>{activeQuiz.difficulty}</span>
                                                </div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '30px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                                    {activeQuiz.questions[currentQuizQuestion].q}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                    {activeQuiz.questions[currentQuizQuestion].options.map((opt, oIdx) => {
                                                        const isSelected = quizSelectedOption === opt;
                                                        const isCorrect = opt === activeQuiz.questions[currentQuizQuestion].answer;

                                                        let bgColor = 'var(--bg-tertiary)';
                                                        let borderColor = 'var(--border-default)';
                                                        let textColor = 'var(--text-primary)';

                                                        if (quizHasConfirmed) {
                                                            if (isCorrect) {
                                                                bgColor = 'rgba(34, 197, 94, 0.1)';
                                                                borderColor = '#22c55e';
                                                                textColor = '#22c55e';
                                                            } else if (isSelected && !isCorrect) {
                                                                bgColor = 'rgba(239, 68, 68, 0.1)';
                                                                borderColor = '#ef4444';
                                                                textColor = '#ef4444';
                                                            }
                                                        } else if (isSelected) {
                                                            bgColor = 'var(--accent-glow)';
                                                            borderColor = 'var(--accent)'; // Highlighting yellow matching Upload File
                                                            textColor = 'var(--accent)';
                                                        }

                                                        return (
                                                            <button
                                                                key={oIdx}
                                                                onClick={() => !quizHasConfirmed && setQuizSelectedOption(opt)}
                                                                className="quiz-option-btn"
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', textAlign: 'left', cursor: quizHasConfirmed ? 'default' : 'pointer',
                                                                    padding: '18px 24px', backgroundColor: bgColor, border: `2px solid ${borderColor}`, color: textColor,
                                                                    borderRadius: '10px', transition: 'all 0.2s ease', fontSize: '16px', outline: 'none'
                                                                }}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: quizHasConfirmed ? '1px solid var(--border-subtle)' : 'none', paddingTop: quizHasConfirmed ? '20px' : '0' }}>
                                                    {!quizHasConfirmed ? (
                                                        <button
                                                            className="btn"
                                                            onClick={handleQuizConfirm}
                                                            disabled={!quizSelectedOption}
                                                            style={{ padding: '14px 30px', fontSize: '16px', opacity: quizSelectedOption ? 1 : 0.5 }}
                                                        >
                                                            Confirm Answer
                                                        </button>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                                                            <div style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: quizSelectedOption === activeQuiz.questions[currentQuizQuestion].answer ? '#22c55e' : '#ef4444' }}>
                                                                {quizSelectedOption === activeQuiz.questions[currentQuizQuestion].answer ? "Correct!" : "Incorrect."}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                                <button className="btn secondary" onClick={() => handleAskCouncil(activeQuiz.questions[currentQuizQuestion])}>
                                                                    <CouncilLogo size={16} /> Ask Council to Explain
                                                                </button>
                                                                <button className="btn" onClick={handleQuizNext} style={{ marginLeft: 'auto' }}>
                                                                    {currentQuizQuestion < activeQuiz.questions.length - 1 ? "Next Question" : "Finish Quiz"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', maxWidth: '500px', margin: '40px auto' }}>
                                                <CheckSquare size={48} style={{ color: 'var(--success)', marginBottom: '15px' }} />
                                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Quiz Completed!</h3>
                                                <p style={{ marginBottom: '25px' }}>You reached the end of the test.</p>
                                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                                    <button className="btn secondary" onClick={() => {
                                                        setCurrentQuizQuestion(0);
                                                        setQuizSelectedOption(null);
                                                        setQuizHasConfirmed(false);
                                                    }}>Restart Quiz</button>
                                                    <button className="btn" onClick={() => setActiveQuizId('new')}>
                                                        New Quiz
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
