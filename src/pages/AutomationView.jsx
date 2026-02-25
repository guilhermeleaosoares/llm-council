import { useState, useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    addEdge,
    useNodesState,
    useEdgesState,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, FolderOpen, Trash2, Bot, FileInput, FileOutput, GitBranch, Merge, Clock, Globe, Search, Image, Zap, MessageSquare } from 'lucide-react';
import { nodeTypes } from '../components/nodes/FlowNodes';
import { MODEL_CATALOG } from '../data/modelConfig';

const SAMPLE_NODES = [
    {
        id: '1',
        type: 'input',
        position: { x: 50, y: 180 },
        data: { inputType: 'text' },
    },
    {
        id: '2',
        type: 'llm',
        position: { x: 320, y: 80 },
        data: { modelId: 'gemini-pro', prompt: 'Analyze from a technical perspective...' },
    },
    {
        id: '3',
        type: 'llm',
        position: { x: 320, y: 300 },
        data: { modelId: 'claude-opus', prompt: 'Provide a creative analysis...' },
    },
    {
        id: '4',
        type: 'merge',
        position: { x: 600, y: 180 },
        data: { strategy: 'best' },
    },
    {
        id: '5',
        type: 'output',
        position: { x: 850, y: 180 },
        data: { outputType: 'display' },
    },
];

const SAMPLE_EDGES = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3', animated: true },
    { id: 'e2-4', source: '2', target: '4', targetHandle: 'a' },
    { id: 'e3-4', source: '3', target: '4', targetHandle: 'b' },
    { id: 'e4-5', source: '4', target: '5' },
];

const PALETTE_ITEMS = [
    { type: 'input', label: 'Input', icon: FileInput, color: 'var(--accent-success, #5bb8a6)' },
    { type: 'llm', label: 'LLM Model', icon: Bot, color: 'var(--accent, #e5a84b)' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: '#d4993f' },
    { type: 'merge', label: 'Merge', icon: Merge, color: '#8b5cf6' },
    { type: 'output', label: 'Output', icon: FileOutput, color: '#60a5fa' },
    // New trigger/action nodes
    { type: 'timer', label: 'Timer', icon: Clock, color: '#f472b6' },
    { type: 'webhook', label: 'Webhook', icon: Globe, color: '#34d399' },
    { type: 'search', label: 'Web Search', icon: Search, color: '#60a5fa' },
    { type: 'imagegen', label: 'Image Gen', icon: Image, color: '#a78bfa' },
];

const SAVED_KEY = 'llm-council-workflows';
const AUTOMATIONS_KEY = 'llm-council-automations';

export default function AutomationView() {
    const [nodes, setNodes, onNodesChange] = useNodesState(SAMPLE_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(SAMPLE_EDGES);
    const [selectedNode, setSelectedNode] = useState(null);
    const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'natural'
    const [nlPrompt, setNlPrompt] = useState('');
    const [savedAutomations, setSavedAutomations] = useState(() => {
        try { return JSON.parse(localStorage.getItem(AUTOMATIONS_KEY) || '[]'); } catch { return []; }
    });
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const onConnect = useCallback((params) => {
        setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    }, [setEdges]);

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type || !reactFlowInstance) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const defaults = {
                llm: { modelId: 'gemini-pro', prompt: '' },
                timer: { schedule: '0 * * * *', label: 'Every hour' },
                webhook: { url: '', method: 'POST' },
                search: { query: '', maxResults: 5 },
                imagegen: { prompt: '', model: '' },
                condition: { condition: '' },
                merge: { strategy: 'concat' },
                input: { inputType: 'text' },
                output: { outputType: 'display' },
            };

            const newNode = {
                id: `node_${Date.now()}`,
                type,
                position,
                data: defaults[type] || {},
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleSave = () => {
        const data = { nodes, edges };
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
        saved.push({ id: Date.now(), name: `Workflow ${saved.length + 1}`, data, created: new Date().toISOString() });
        localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    };

    const handleClear = () => {
        setNodes([]);
        setEdges([]);
        setSelectedNode(null);
    };

    // ── Parse NL description into structured workflow steps ──
    const parseNlToSteps = (prompt) => {
        const lower = prompt.toLowerCase();
        const steps = [];

        // Detect trigger
        if (/every\s+(morning|evening|day|hour|minute|week|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(prompt)) {
            const match = prompt.match(/every\s+(morning|evening|day|hour|minute|week|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(at\s*(\d{1,2})\s*(am|pm)?)?/i);
            const timeLabel = match ? match[0] : 'Every day';
            let cron = '0 9 * * *';
            if (/hour/i.test(timeLabel)) cron = '0 * * * *';
            if (/minute/i.test(timeLabel)) cron = '* * * * *';
            if (/morning/i.test(timeLabel)) cron = '0 9 * * *';
            if (/evening|night/i.test(timeLabel)) cron = '0 18 * * *';
            if (/week/i.test(timeLabel)) cron = '0 9 * * 1';
            steps.push({ type: 'timer', label: timeLabel, schedule: cron });
        } else if (/when|on\s+(new|incoming|receive)/i.test(prompt)) {
            steps.push({ type: 'webhook', label: 'Webhook Trigger', url: '', method: 'POST' });
        } else {
            steps.push({ type: 'input', label: 'Manual Input', inputType: 'text' });
        }

        // Detect search
        if (/search|look\s*up|find\s+(latest|news|info|articles|results)/i.test(prompt)) {
            const searchMatch = prompt.match(/search\s+(?:for\s+)?(?:the\s+)?(?:latest\s+)?(.+?)(?:,|\.|and\s|then\s|using\s|with\s|$)/i);
            steps.push({ type: 'search', label: 'Web Search', query: searchMatch ? searchMatch[1].trim() : '' });
        }

        // Detect model actions
        const modelKeywords = [
            { pattern: /summarize|summary/i, prompt: 'Summarize the following content concisely:', label: 'Summarize' },
            { pattern: /analyze|analysis/i, prompt: 'Analyze the following:', label: 'Analyze' },
            { pattern: /translate/i, prompt: 'Translate the following:', label: 'Translate' },
            { pattern: /rewrite|rephrase/i, prompt: 'Rewrite the following:', label: 'Rewrite' },
            { pattern: /classify|categorize/i, prompt: 'Classify the following:', label: 'Classify' },
            { pattern: /generate|create|write/i, prompt: 'Generate based on:', label: 'Generate' },
        ];

        let foundAction = false;
        for (const kw of modelKeywords) {
            if (kw.pattern.test(lower)) {
                // Detect specific model mentions
                let modelId = 'gemini-pro';
                if (/gemini/i.test(lower)) modelId = 'gemini-2.5-flash-preview-05-20';
                else if (/claude/i.test(lower)) modelId = 'claude-sonnet-4-20250514';
                else if (/gpt/i.test(lower)) modelId = 'gpt-4o';
                else if (/grok/i.test(lower)) modelId = 'grok-3-latest';
                else if (/llama/i.test(lower)) modelId = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

                steps.push({ type: 'llm', label: kw.label, modelId, prompt: kw.prompt, temperature: 0.7 });
                foundAction = true;
                break;
            }
        }
        if (!foundAction) {
            steps.push({ type: 'llm', label: 'Process with LLM', modelId: 'gemini-2.5-flash-preview-05-20', prompt: prompt, temperature: 0.7 });
        }

        // Detect image gen
        if (/image|picture|photo|illustration|draw/i.test(lower)) {
            steps.push({ type: 'imagegen', label: 'Generate Image', prompt: '' });
        }

        // Detect output
        if (/webhook|send\s+to|post\s+to|notify/i.test(lower) && !/^when/i.test(prompt)) {
            steps.push({ type: 'output', label: 'Send to Webhook', outputType: 'webhook', url: '' });
        } else if (/email|mail/i.test(lower)) {
            steps.push({ type: 'output', label: 'Send Email', outputType: 'email' });
        } else if (/save|file|download/i.test(lower)) {
            steps.push({ type: 'output', label: 'Save to File', outputType: 'file' });
        } else {
            steps.push({ type: 'output', label: 'Display Result', outputType: 'display' });
        }

        return steps;
    };

    const handleNlGenerate = () => {
        if (!nlPrompt.trim()) return;
        const steps = parseNlToSteps(nlPrompt);
        const automation = {
            id: Date.now(),
            name: nlPrompt.slice(0, 60),
            prompt: nlPrompt,
            steps,
            type: 'natural-language',
            created: new Date().toISOString(),
        };
        const next = [...savedAutomations, automation];
        setSavedAutomations(next);
        localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(next));
        setNlPrompt('');
        setEditingId(automation.id);
    };

    const updateAutomation = (id, updates) => {
        const next = savedAutomations.map(a => a.id === id ? { ...a, ...updates } : a);
        setSavedAutomations(next);
        localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(next));
    };

    const updateStep = (automationId, stepIdx, updates) => {
        const automation = savedAutomations.find(a => a.id === automationId);
        if (!automation) return;
        const newSteps = automation.steps.map((s, i) => i === stepIdx ? { ...s, ...updates } : s);
        updateAutomation(automationId, { steps: newSteps });
    };

    const deleteAutomation = (id) => {
        const next = savedAutomations.filter(a => a.id !== id);
        setSavedAutomations(next);
        localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(next));
        if (editingId === id) setEditingId(null);
    };

    const STEP_ICONS = {
        timer: Clock, webhook: Globe, input: FileInput, search: Search,
        llm: Bot, imagegen: Image, output: FileOutput, condition: GitBranch, merge: Merge,
    };

    const STEP_COLORS = {
        timer: '#f472b6', webhook: '#34d399', input: '#5bb8a6', search: '#60a5fa',
        llm: 'var(--accent, #e5a84b)', imagegen: '#a78bfa', output: '#60a5fa',
        condition: '#d4993f', merge: '#8b5cf6',
    };

    return (
        <div className="automation-view">
            <div className="automation-header">
                <h2>Automation Builder</h2>
                <div className="automation-tabs">
                    <button
                        className={`auto-tab ${activeTab === 'visual' ? 'active' : ''}`}
                        onClick={() => setActiveTab('visual')}
                    >
                        <Zap size={13} /> Visual
                    </button>
                    <button
                        className={`auto-tab ${activeTab === 'natural' ? 'active' : ''}`}
                        onClick={() => setActiveTab('natural')}
                    >
                        <MessageSquare size={13} /> Natural Language
                    </button>
                </div>
                {activeTab === 'visual' && (
                    <div className="automation-toolbar">
                        <button className="toolbar-btn" onClick={handleClear}>
                            <Trash2 size={14} /> Clear
                        </button>
                        <button className="toolbar-btn" onClick={handleSave}>
                            <Save size={14} /> Save
                        </button>
                        <button className="toolbar-btn primary">
                            <Play size={14} /> Run
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'visual' ? (
                <div className="automation-canvas" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="rgba(255,255,255,0.05)"
                        />
                        <Controls />
                    </ReactFlow>

                    {/* Node Palette */}
                    <div className="node-palette">
                        <h4>Nodes</h4>
                        {PALETTE_ITEMS.map((item) => (
                            <div
                                key={item.type}
                                className="palette-node"
                                draggable
                                onDragStart={(e) => onDragStart(e, item.type)}
                            >
                                <div className="palette-node-icon" style={{ backgroundColor: item.color }}>
                                    <item.icon size={14} color="white" />
                                </div>
                                {item.label}
                            </div>
                        ))}
                    </div>

                    {/* Properties Panel */}
                    {selectedNode && (
                        <div className="properties-panel">
                            <h4>Node Properties</h4>

                            <div className="prop-group">
                                <div className="prop-label">Type</div>
                                <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                                    {selectedNode.type}
                                </div>
                            </div>

                            <div className="prop-group">
                                <div className="prop-label">ID</div>
                                <input className="prop-input" value={selectedNode.id} readOnly />
                            </div>

                            {selectedNode.type === 'llm' && (
                                <>
                                    <div className="prop-group">
                                        <div className="prop-label">Model</div>
                                        <select
                                            className="prop-input"
                                            defaultValue={selectedNode.data.modelId}
                                            onChange={(e) => {
                                                setNodes(nds => nds.map(n =>
                                                    n.id === selectedNode.id
                                                        ? { ...n, data: { ...n.data, modelId: e.target.value } }
                                                        : n
                                                ));
                                            }}
                                        >
                                            {MODEL_CATALOG.map(m => (
                                                <option key={m.slug} value={m.slug}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="prop-group">
                                        <div className="prop-label">Prompt Template</div>
                                        <textarea
                                            className="prop-textarea"
                                            defaultValue={selectedNode.data.prompt}
                                            placeholder="Enter your prompt template..."
                                        />
                                    </div>
                                    <div className="prop-group">
                                        <div className="prop-label">Temperature</div>
                                        <input className="prop-input" type="number" min="0" max="2" step="0.1" defaultValue="0.7" />
                                    </div>
                                </>
                            )}

                            {selectedNode.type === 'timer' && (
                                <>
                                    <div className="prop-group">
                                        <div className="prop-label">Schedule (Cron)</div>
                                        <input
                                            className="prop-input"
                                            defaultValue={selectedNode.data.schedule || '0 * * * *'}
                                            placeholder="0 * * * * (every hour)"
                                        />
                                    </div>
                                    <div className="prop-group">
                                        <div className="prop-label">Presets</div>
                                        <select className="prop-input" defaultValue="">
                                            <option value="">Custom...</option>
                                            <option value="*/5 * * * *">Every 5 minutes</option>
                                            <option value="0 * * * *">Every hour</option>
                                            <option value="0 0 * * *">Daily at midnight</option>
                                            <option value="0 9 * * 1-5">Weekdays at 9am</option>
                                            <option value="0 0 * * 0">Weekly (Sunday)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {selectedNode.type === 'webhook' && (
                                <>
                                    <div className="prop-group">
                                        <div className="prop-label">URL</div>
                                        <input
                                            className="prop-input"
                                            defaultValue={selectedNode.data.url || ''}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="prop-group">
                                        <div className="prop-label">Method</div>
                                        <select className="prop-input" defaultValue={selectedNode.data.method || 'POST'}>
                                            <option value="GET">GET</option>
                                            <option value="POST">POST</option>
                                            <option value="PUT">PUT</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {selectedNode.type === 'search' && (
                                <div className="prop-group">
                                    <div className="prop-label">Search Query Template</div>
                                    <input
                                        className="prop-input"
                                        defaultValue={selectedNode.data.query || ''}
                                        placeholder="{{input}} latest news"
                                    />
                                </div>
                            )}

                            {selectedNode.type === 'imagegen' && (
                                <div className="prop-group">
                                    <div className="prop-label">Image Prompt Template</div>
                                    <textarea
                                        className="prop-textarea"
                                        defaultValue={selectedNode.data.prompt || ''}
                                        placeholder="Generate an image of {{input}}"
                                    />
                                </div>
                            )}

                            {selectedNode.type === 'condition' && (
                                <>
                                    <div className="prop-group">
                                        <div className="prop-label">Condition Type</div>
                                        <select className="prop-input" defaultValue="contains">
                                            <option value="contains">Contains keyword</option>
                                            <option value="confidence">Confidence threshold</option>
                                            <option value="regex">Regex match</option>
                                            <option value="length">Output length</option>
                                        </select>
                                    </div>
                                    <div className="prop-group">
                                        <div className="prop-label">Expression</div>
                                        <input
                                            className="prop-input"
                                            defaultValue={selectedNode.data.condition || ''}
                                            placeholder='e.g. contains("yes") or confidence > 0.8'
                                        />
                                    </div>
                                </>
                            )}

                            {selectedNode.type === 'merge' && (
                                <div className="prop-group">
                                    <div className="prop-label">Merge Strategy</div>
                                    <select className="prop-input" defaultValue={selectedNode.data.strategy || 'concat'}>
                                        <option value="concat">Concatenate</option>
                                        <option value="vote">Majority Vote</option>
                                        <option value="best">Best Response</option>
                                        <option value="summarize">Summarize All</option>
                                    </select>
                                </div>
                            )}

                            {selectedNode.type === 'output' && (
                                <div className="prop-group">
                                    <div className="prop-label">Output Type</div>
                                    <select className="prop-input" defaultValue={selectedNode.data.outputType || 'display'}>
                                        <option value="display">Display in Chat</option>
                                        <option value="webhook">Send to Webhook</option>
                                        <option value="file">Save to File</option>
                                        <option value="email">Send Email</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ── Natural Language Automation ── */
                <div className="nl-automation">
                    <div className="nl-header">
                        <p>Describe your automation in plain language. It will be parsed into an editable workflow.</p>
                    </div>
                    <div className="nl-input-area">
                        <textarea
                            className="nl-textarea"
                            value={nlPrompt}
                            onChange={e => setNlPrompt(e.target.value)}
                            placeholder="Example: Every morning at 9am, search for the latest AI news, summarize it using Gemini, and send the summary to my webhook..."
                            rows={5}
                        />
                        <div className="nl-actions">
                            <button className="toolbar-btn primary" onClick={handleNlGenerate} disabled={!nlPrompt.trim()}>
                                <Zap size={14} /> Generate Workflow
                            </button>
                        </div>
                    </div>

                    {/* Saved natural language automations */}
                    {savedAutomations.length > 0 && (
                        <div className="nl-saved">
                            <h4>Saved Automations ({savedAutomations.length})</h4>
                            {savedAutomations.map(a => {
                                const isEditing = editingId === a.id;
                                return (
                                    <div key={a.id} className="nl-saved-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <input
                                                className="prop-input"
                                                value={a.name}
                                                onChange={e => updateAutomation(a.id, { name: e.target.value })}
                                                style={{ flex: 1, fontWeight: 600, fontSize: 13, background: 'transparent', border: '1px solid transparent', padding: '4px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                                                onFocus={e => e.target.style.borderColor = 'var(--border-default)'}
                                                onBlur={e => e.target.style.borderColor = 'transparent'}
                                            />
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button
                                                    className="toolbar-btn"
                                                    onClick={() => setEditingId(isEditing ? null : a.id)}
                                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                                >
                                                    {isEditing ? 'Collapse' : 'Edit'}
                                                </button>
                                                <button
                                                    className="toolbar-btn primary"
                                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                                    title="Run automation"
                                                >
                                                    <Play size={10} />
                                                </button>
                                                <button
                                                    className="nl-saved-del"
                                                    onClick={() => deleteAutomation(a.id)}
                                                    style={{ fontSize: 16, lineHeight: 1, padding: '2px 6px' }}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        </div>

                                        <div className="nl-saved-meta" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                            {a.steps?.length || 0} steps · {new Date(a.created).toLocaleDateString()}
                                        </div>

                                        {/* Step pipeline preview */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                            {(a.steps || []).map((step, i) => {
                                                const Icon = STEP_ICONS[step.type] || Zap;
                                                return (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                                                            background: `${STEP_COLORS[step.type] || '#666'}15`,
                                                            border: `1px solid ${STEP_COLORS[step.type] || '#666'}30`,
                                                            fontSize: 11, color: STEP_COLORS[step.type] || '#ccc'
                                                        }}>
                                                            <Icon size={11} /> {step.label}
                                                        </div>
                                                        {i < (a.steps || []).length - 1 && (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Editable steps (expanded) */}
                                        {isEditing && (
                                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {(a.steps || []).map((step, i) => {
                                                    const Icon = STEP_ICONS[step.type] || Zap;
                                                    return (
                                                        <div key={i} style={{
                                                            padding: 12, borderRadius: 'var(--radius-md)',
                                                            background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                                                            border: '1px solid var(--border-subtle)',
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                                <div style={{
                                                                    width: 24, height: 24, borderRadius: 6,
                                                                    background: STEP_COLORS[step.type] || '#666',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    <Icon size={12} color="white" />
                                                                </div>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                                                    Step {i + 1}: {step.type}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                                <div>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Label</div>
                                                                    <input
                                                                        className="prop-input"
                                                                        value={step.label}
                                                                        onChange={e => updateStep(a.id, i, { label: e.target.value })}
                                                                        style={{ fontSize: 12, padding: '5px 8px' }}
                                                                    />
                                                                </div>
                                                                {step.type === 'timer' && (
                                                                    <div>
                                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Schedule (Cron)</div>
                                                                        <input
                                                                            className="prop-input"
                                                                            value={step.schedule || ''}
                                                                            onChange={e => updateStep(a.id, i, { schedule: e.target.value })}
                                                                            style={{ fontSize: 12, padding: '5px 8px' }}
                                                                            placeholder="0 9 * * *"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {step.type === 'llm' && (
                                                                    <>
                                                                        <div>
                                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Model</div>
                                                                            <select
                                                                                className="prop-input"
                                                                                value={step.modelId || ''}
                                                                                onChange={e => updateStep(a.id, i, { modelId: e.target.value })}
                                                                                style={{ fontSize: 12, padding: '5px 8px' }}
                                                                            >
                                                                                {MODEL_CATALOG.filter(m => m.type === 'text').map(m => (
                                                                                    <option key={m.slug} value={m.slug}>{m.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {step.type === 'search' && (
                                                                    <div>
                                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Query</div>
                                                                        <input
                                                                            className="prop-input"
                                                                            value={step.query || ''}
                                                                            onChange={e => updateStep(a.id, i, { query: e.target.value })}
                                                                            style={{ fontSize: 12, padding: '5px 8px' }}
                                                                            placeholder="Search query template..."
                                                                        />
                                                                    </div>
                                                                )}
                                                                {step.type === 'webhook' && (
                                                                    <div>
                                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>URL</div>
                                                                        <input
                                                                            className="prop-input"
                                                                            value={step.url || ''}
                                                                            onChange={e => updateStep(a.id, i, { url: e.target.value })}
                                                                            style={{ fontSize: 12, padding: '5px 8px' }}
                                                                            placeholder="https://..."
                                                                        />
                                                                    </div>
                                                                )}
                                                                {step.type === 'output' && (
                                                                    <div>
                                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Output Type</div>
                                                                        <select
                                                                            className="prop-input"
                                                                            value={step.outputType || 'display'}
                                                                            onChange={e => updateStep(a.id, i, { outputType: e.target.value })}
                                                                            style={{ fontSize: 12, padding: '5px 8px' }}
                                                                        >
                                                                            <option value="display">Display in Chat</option>
                                                                            <option value="webhook">Send to Webhook</option>
                                                                            <option value="file">Save to File</option>
                                                                            <option value="email">Send Email</option>
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {step.type === 'llm' && (
                                                                <div style={{ marginTop: 8 }}>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Prompt</div>
                                                                    <textarea
                                                                        className="prop-textarea"
                                                                        value={step.prompt || ''}
                                                                        onChange={e => updateStep(a.id, i, { prompt: e.target.value })}
                                                                        style={{ fontSize: 12, padding: '5px 8px', minHeight: 60 }}
                                                                        placeholder="Enter prompt template..."
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

