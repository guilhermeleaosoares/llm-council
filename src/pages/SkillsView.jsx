import { useState } from 'react';
import { Plus, Trash2, Edit2, Wand2, Check, X, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { useSkills } from '../context/SkillsContext';
import { useCouncil } from '../context/CouncilContext';

const API_BASE = 'http://localhost:3001/api';

const DEFAULT_COLORS = [
    '#e5a84b', '#5bb8a6', '#7c6fff', '#e05c7a',
    '#3b9eff', '#f97316', '#a78bfa', '#34d399',
];

async function generateSkillFromAI(description, model) {
    const systemPrompt = `You are a skill definition generator for LLM Council, an AI multi-model chat app.
Generate a structured skill definition from the user's description. Return ONLY a raw JSON object — no markdown, no code fences, no explanation, nothing else.
The JSON must have exactly these fields:
- name: Short skill name (2-5 words, title case)
- description: One sentence describing what this skill does
- systemPrompt: Detailed system instructions that shape the AI's behavior when this skill is active. Be specific and actionable (4-8 sentences). Start with a clear role definition.
- color: A hex color fitting the skill's theme (e.g. "#4ade80" for coding, "#f97316" for writing)
- icon: A single relevant emoji`;

    const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apiKey: model.apiKey,
            baseUrl: model.baseUrl,
            modelSlug: model.slug,
            messages: [{ role: 'user', content: description }],
            systemPrompt,
            temperature: 0.7,
        }),
    });
    if (!res.ok) throw new Error('API call failed');
    const data = await res.json();
    const raw = (data.text || data.content || '').trim();
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(clean);
}

function SkillCard({ skill, onToggle, onEdit, onDelete }) {
    return (
        <div className={`skill-card ${skill.enabled ? 'enabled' : 'disabled'}`}>
            <div className="skill-card-top">
                <div className="skill-card-icon" style={{ background: skill.color + '22', borderColor: skill.color + '44' }}>
                    <span style={{ fontSize: 22 }}>{skill.icon || '⚡'}</span>
                </div>
                <div className="skill-card-info">
                    <div className="skill-card-name">{skill.name}</div>
                    <div className="skill-card-desc">{skill.description}</div>
                </div>
                <button
                    className={`skill-toggle-btn ${skill.enabled ? 'on' : 'off'}`}
                    onClick={() => onToggle(skill.id)}
                    title={skill.enabled ? 'Disable skill' : 'Enable skill'}
                >
                    {skill.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
            </div>
            <div className="skill-card-prompt">{skill.systemPrompt}</div>
            <div className="skill-card-actions">
                <button className="skill-action-btn" onClick={() => onEdit(skill)} title="Edit">
                    <Edit2 size={12} /> Edit
                </button>
                <button className="skill-action-btn danger" onClick={() => onDelete(skill.id)} title="Delete">
                    <Trash2 size={12} /> Delete
                </button>
            </div>
        </div>
    );
}

function SkillFormModal({ initial, onSave, onClose }) {
    const [form, setForm] = useState(initial || {
        name: '', description: '', systemPrompt: '', color: DEFAULT_COLORS[0], icon: '⚡',
    });

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <h3>{initial ? 'Edit Skill' : 'New Skill'}</h3>

                <div className="skill-form-row">
                    <div className="modal-field" style={{ flex: '0 0 56px' }}>
                        <label>Icon</label>
                        <input
                            className="input-field"
                            style={{ textAlign: 'center', fontSize: 20, padding: '6px' }}
                            value={form.icon}
                            onChange={e => set('icon', e.target.value)}
                            maxLength={2}
                        />
                    </div>
                    <div className="modal-field" style={{ flex: 1 }}>
                        <label>Name</label>
                        <input
                            className="input-field"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="e.g. Code Reviewer"
                        />
                    </div>
                </div>

                <div className="modal-field">
                    <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(shown in the skill card)</span></label>
                    <input
                        className="input-field"
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="One sentence about what this skill does"
                    />
                </div>

                <div className="modal-field">
                    <label>System Prompt <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(injected when skill is active)</span></label>
                    <textarea
                        className="input-field"
                        style={{ minHeight: 120, resize: 'vertical' }}
                        value={form.systemPrompt}
                        onChange={e => set('systemPrompt', e.target.value)}
                        placeholder="Detailed instructions that shape how the AI responds..."
                    />
                </div>

                <div className="modal-field">
                    <label>Color</label>
                    <div className="skill-color-row">
                        {DEFAULT_COLORS.map(c => (
                            <button
                                key={c}
                                className={`skill-color-dot ${form.color === c ? 'selected' : ''}`}
                                style={{ background: c }}
                                onClick={() => set('color', c)}
                            />
                        ))}
                        <input
                            type="color"
                            value={form.color}
                            onChange={e => set('color', e.target.value)}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none' }}
                            title="Custom color"
                        />
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="modal-btn primary"
                        onClick={() => { if (form.name.trim() && form.systemPrompt.trim()) onSave(form); }}
                        disabled={!form.name.trim() || !form.systemPrompt.trim()}
                    >
                        {initial ? 'Save Changes' : 'Create Skill'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SkillsView() {
    const { skills, addSkill, updateSkill, removeSkill, toggleSkill } = useSkills();
    const { textModels } = useCouncil();

    // Creator state
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [creatorMode, setCreatorMode] = useState('ai'); // 'ai' | 'manual'
    const [aiDescription, setAiDescription] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState(null);
    const [genError, setGenError] = useState('');

    // Edit modal state
    const [editingSkill, setEditingSkill] = useState(null);
    const [showManualModal, setShowManualModal] = useState(false);

    const bestModel = textModels[0] || null;

    const handleGenerate = async () => {
        if (!aiDescription.trim() || !bestModel) return;
        setGenerating(true);
        setGenError('');
        setGenerated(null);
        try {
            const result = await generateSkillFromAI(aiDescription.trim(), bestModel);
            setGenerated(result);
        } catch (e) {
            setGenError('Failed to generate skill. Check that a text model is enabled and the backend is running.');
        } finally {
            setGenerating(false);
        }
    };

    const handleAddGenerated = () => {
        if (!generated) return;
        addSkill(generated);
        setGenerated(null);
        setAiDescription('');
        setCreatorOpen(false);
    };

    const handleEditSave = (form) => {
        if (editingSkill) {
            updateSkill(editingSkill.id, form);
            setEditingSkill(null);
        } else {
            addSkill(form);
            setShowManualModal(false);
        }
    };

    const enabledCount = skills.filter(s => s.enabled).length;

    return (
        <div className="skills-view">
            <div className="skills-header">
                <div>
                    <h1>Skills</h1>
                    <p className="skills-subtitle">
                        Reusable AI behaviors injected into every conversation when active.
                        {enabledCount > 0 && (
                            <span className="skills-active-badge">{enabledCount} active</span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="create-project-btn secondary" onClick={() => { setShowManualModal(true); setEditingSkill(null); }}>
                        <Plus size={14} /> Manual
                    </button>
                    <button className="create-project-btn" onClick={() => setCreatorOpen(v => !v)}>
                        <Wand2 size={14} /> Create with AI
                    </button>
                </div>
            </div>

            {/* ── AI Skill Creator ── */}
            {creatorOpen && (
                <div className="skill-creator">
                    <div className="skill-creator-header">
                        <Wand2 size={15} style={{ color: 'var(--accent)' }} />
                        <span>Skill Creator</span>
                        <button className="skill-creator-close" onClick={() => { setCreatorOpen(false); setGenerated(null); setAiDescription(''); setGenError(''); }}>
                            <X size={14} />
                        </button>
                    </div>

                    {!generated ? (
                        <>
                            <p className="skill-creator-hint">
                                Describe what you want the skill to do — the AI will generate a name, description, and system prompt for you.
                            </p>
                            {!bestModel && (
                                <div className="skill-creator-warn">
                                    No text model enabled. Add a model in Settings to use AI generation.
                                </div>
                            )}
                            <textarea
                                className="input-field skill-creator-textarea"
                                placeholder={`e.g. "A coding assistant that always reviews for security vulnerabilities, suggests test cases, and follows clean code principles"`}
                                value={aiDescription}
                                onChange={e => setAiDescription(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                                disabled={generating}
                            />
                            {genError && <div className="skill-creator-error">{genError}</div>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                <button
                                    className="btn primary"
                                    onClick={handleGenerate}
                                    disabled={generating || !aiDescription.trim() || !bestModel}
                                >
                                    {generating ? <><Loader size={13} className="spin" /> Generating…</> : <><Wand2 size={13} /> Generate Skill</>}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="skill-preview">
                            <div className="skill-preview-label">
                                <Check size={13} style={{ color: 'var(--success)' }} /> Skill generated — review and add
                            </div>
                            <div className="skill-preview-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontSize: 26 }}>{generated.icon || '⚡'}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {generated.name}
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: generated.color || 'var(--accent)', display: 'inline-block' }} />
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{generated.description}</div>
                                    </div>
                                </div>
                                <div className="skill-preview-prompt">{generated.systemPrompt}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                                <button className="btn secondary" onClick={() => { setGenerated(null); setGenError(''); }}>
                                    <X size={13} /> Regenerate
                                </button>
                                <button className="btn primary" onClick={handleAddGenerated}>
                                    <Plus size={13} /> Add to Skills
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Skills Grid ── */}
            {skills.length === 0 && !creatorOpen ? (
                <div className="skills-empty">
                    <Wand2 size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>No skills yet</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340, textAlign: 'center' }}>
                        Create a skill to give the council a persistent behavior — like a code reviewer, a writing coach, or a specific domain expert.
                    </div>
                    <button className="btn primary" style={{ marginTop: 20 }} onClick={() => setCreatorOpen(true)}>
                        <Wand2 size={13} /> Create your first skill
                    </button>
                </div>
            ) : (
                <div className="skills-grid">
                    {skills.map(skill => (
                        <SkillCard
                            key={skill.id}
                            skill={skill}
                            onToggle={toggleSkill}
                            onEdit={s => setEditingSkill(s)}
                            onDelete={removeSkill}
                        />
                    ))}
                </div>
            )}

            {/* ── Edit / Manual Create Modal ── */}
            {(editingSkill || showManualModal) && (
                <SkillFormModal
                    initial={editingSkill}
                    onSave={handleEditSave}
                    onClose={() => { setEditingSkill(null); setShowManualModal(false); }}
                />
            )}
        </div>
    );
}
