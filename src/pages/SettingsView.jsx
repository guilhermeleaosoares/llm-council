import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Loader, CheckCircle, Crown, Image, Video, MessageSquare, Download, Upload } from 'lucide-react';
import { useCouncil } from '../context/CouncilContext';
import { MODEL_CATALOG, MODEL_COLORS } from '../data/modelConfig';

import { useLocation } from 'react-router-dom';

const TYPE_ICONS = { text: MessageSquare, image: Image, video: Video };
const TYPE_LABELS = { text: 'Text / LLM', image: 'Image', video: 'Video' };

export default function SettingsView() {
    const location = useLocation();
    const { models, addModel, updateModel, removeModel, testModel, importModels, toolKeys, setToolKeys } = useCouncil();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'models');
    const [showModal, setShowModal] = useState(false);
    const [showKeys, setShowKeys] = useState({});
    const [testing, setTesting] = useState({});
    const [testResults, setTestResults] = useState({});
    const fileInputRef = React.useRef(null);

    // Add/Edit Model form state
    const [form, setForm] = useState({
        id: null, // used for edit mode
        name: '', provider: '', slug: '', baseUrl: '', apiKey: '',
        type: 'text', color: MODEL_COLORS[0], abbrev: '',
        capabilities: [],
    });
    const [catalogFilter, setCatalogFilter] = useState('');

    const openAddModal = () => {
        setForm({ id: null, name: '', provider: '', slug: '', baseUrl: '', apiKey: '', type: 'text', color: MODEL_COLORS[Math.floor(Math.random() * MODEL_COLORS.length)], abbrev: '', capabilities: [] });
        setCatalogFilter('');
        setShowModal(true);
    };

    const openEditModal = (model) => {
        setForm({
            id: model.id,
            name: model.name,
            provider: model.provider,
            slug: model.slug,
            baseUrl: model.baseUrl || '',
            apiKey: model.apiKey || '',
            type: model.type || 'text',
            color: model.color || MODEL_COLORS[0],
            abbrev: model.abbrev || '',
            capabilities: model.capabilities || [],
        });
        setCatalogFilter('');
        setShowModal(true);
    };

    const selectFromCatalog = (item) => {
        setForm({
            ...form,
            name: item.name,
            provider: item.provider,
            slug: item.slug,
            baseUrl: item.baseUrl,
            type: item.type,
            color: item.color,
            abbrev: item.abbrev,
            capabilities: item.capabilities || [],
        });
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.apiKey.trim()) return;

        const payload = {
            name: form.name,
            provider: form.provider || 'Custom',
            slug: form.slug,
            baseUrl: form.baseUrl,
            apiKey: form.apiKey,
            type: form.type,
            color: form.color,
            abbrev: form.abbrev || form.name[0]?.toUpperCase() || '?',
            capabilities: form.capabilities,
        };

        if (form.id) {
            updateModel(form.id, payload);
        } else {
            addModel(payload);
        }
        setShowModal(false);
    };

    const handleTest = async (model) => {
        setTesting(prev => ({ ...prev, [model.id]: true }));
        setTestResults(prev => ({ ...prev, [model.id]: null }));
        const result = await testModel(model);
        setTestResults(prev => ({ ...prev, [model.id]: result }));
        setTesting(prev => ({ ...prev, [model.id]: false }));
    };

    const filtered = catalogFilter
        ? MODEL_CATALOG.filter(m => m.name.toLowerCase().includes(catalogFilter.toLowerCase()) || m.provider.toLowerCase().includes(catalogFilter.toLowerCase()))
        : MODEL_CATALOG;

    return (
        <div className="settings-view">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your LLM capabilities and integration configurations.</p>
                <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingBottom: 0, borderBottom: '1px solid var(--border-subtle)' }}>
                    <button
                        onClick={() => setActiveTab('models')}
                        style={{ background: 'none', border: 'none', padding: '0 0 12px 0', cursor: 'pointer', color: activeTab === 'models' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'models' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'models' ? 600 : 400, fontSize: 14 }}
                    >
                        Model APIs
                    </button>
                    <button
                        onClick={() => setActiveTab('tools')}
                        style={{ background: 'none', border: 'none', padding: '0 0 12px 0', cursor: 'pointer', color: activeTab === 'tools' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'tools' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'tools' ? 600 : 400, fontSize: 14 }}
                    >
                        Tool APIs
                    </button>
                </div>
            </div>

            <div className="settings-content">
                {activeTab === 'models' ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div className="settings-section-title" style={{ padding: 0 }}>Your Models ({models.length})</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="create-project-btn" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={14} /> Import Config
                                </button>
                                <input
                                    type="file"
                                    accept=".json"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            try {
                                                const parsed = JSON.parse(event.target.result);
                                                importModels(parsed);
                                            } catch (err) {
                                                console.error('Failed to parse config:', err);
                                                alert('Invalid config file.');
                                            }
                                        };
                                        reader.readAsText(file);
                                        e.target.value = ''; // Reset input
                                    }}
                                />
                                <button className="create-project-btn" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} onClick={async () => {
                                    try {
                                        const response = await fetch('http://localhost:3001/api/export-config', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(models)
                                        });
                                        const data = await response.json();
                                        if (data.success) {
                                            alert(`Config saved successfully to:\n${data.path}`);
                                        } else {
                                            throw new Error(data.error || 'Failed to export');
                                        }
                                    } catch (err) {
                                        console.error('Export error:', err);
                                        alert('Failed to export config. Ensure the backend is running.');
                                    }
                                }}>
                                    <Download size={14} /> Export Config
                                </button>
                                <button className="create-project-btn" onClick={openAddModal}>
                                    <Plus size={14} /> Add Model
                                </button>
                            </div>
                        </div>

                        {models.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                No models added yet. Click "Add Model" to get started.
                            </div>
                        )}

                        {models.map(model => {
                            const TypeIcon = TYPE_ICONS[model.type] || MessageSquare;
                            const result = testResults[model.id];
                            return (
                                <div key={model.id} className={`model-config-card ${!model.enabled ? 'disabled-card' : ''}`}>
                                    <div className="model-icon" style={{ backgroundColor: model.color }}>
                                        {model.abbrev}
                                    </div>
                                    <div className="model-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="model-name">{model.name}</span>
                                            <span className="cap-tag" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <TypeIcon size={9} /> {TYPE_LABELS[model.type]}
                                            </span>
                                        </div>
                                        <div className="model-provider">{model.provider} · {model.slug}</div>
                                        {model.capabilities?.length > 0 && (
                                            <div className="model-capabilities">
                                                {model.capabilities.map(c => <span key={c} className="cap-tag">{c}</span>)}
                                            </div>
                                        )}

                                        <div className="api-key-row">
                                            <input
                                                className="api-key-input"
                                                type={showKeys[model.id] ? 'text' : 'password'}
                                                value={model.apiKey || ''}
                                                onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                                                placeholder="API key..."
                                            />
                                            <button className="test-btn" onClick={() => setShowKeys(p => ({ ...p, [model.id]: !p[model.id] }))} style={{ padding: '4px 6px' }}>
                                                {showKeys[model.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                            <button className="test-btn" onClick={() => handleTest(model)} disabled={!model.apiKey || testing[model.id]}>
                                                {testing[model.id] ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> : 'Test'}
                                            </button>
                                            {result && (
                                                <span className={`api-key-status ${result.success ? 'connected' : 'missing'}`}>
                                                    {result.success ? '✓ Connected' : '✗ Failed'}
                                                </span>
                                            )}
                                        </div>
                                        {result && !result.success && (
                                            <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4 }}>{result.error}</div>
                                        )}
                                    </div>

                                    <div className="model-controls">
                                        <div className="tier-select">
                                            {[1, 2, 3].map(t => (
                                                <button key={t}
                                                    className={`tier-btn ${model.tier === t ? `active t${t}` : ''}`}
                                                    onClick={() => updateModel(model.id, { tier: t })}
                                                >T{t}</button>
                                            ))}
                                        </div>
                                        <div className="weight-slider-container">
                                            <input type="range" min="0" max="100" value={model.weight || 80}
                                                onChange={e => updateModel(model.id, { weight: parseInt(e.target.value) })}
                                                className="weight-slider"
                                            />
                                            <span className="weight-value">{model.weight || 80}%</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <button
                                                className={`toggle-switch ${model.enabled && model.apiKey ? 'active' : ''} ${!model.apiKey ? 'disabled-toggle' : ''}`}
                                                onClick={() => model.apiKey && updateModel(model.id, { enabled: !model.enabled })}
                                                title={!model.apiKey ? 'Add API key first' : model.enabled ? 'Disable' : 'Enable'}
                                            />
                                            <button onClick={() => openEditModal(model)}
                                                style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)', cursor: 'pointer', padding: '4px 8px', fontSize: 11 }}
                                                title="Edit model"
                                            >
                                                Edit
                                            </button>
                                            <button onClick={() => removeModel(model.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                                                title="Remove model"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                ) : (
                    <div className="tool-settings-section" style={{ maxWidth: 600 }}>
                        <div className="settings-section-title" style={{ padding: 0, marginBottom: 16 }}>n8n Integration</div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                            Connect your n8n instance to replace the custom builder with true automation graph capabilities. The LLM Council will use these credentials to tune your automations.
                        </p>
                        <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                            <div className="modal-field" style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>n8n Instance URL</label>
                                <input
                                    value={toolKeys?.n8nUrl || ''}
                                    onChange={e => setToolKeys(prev => ({ ...prev, n8nUrl: e.target.value }))}
                                    placeholder="e.g., https://your-n8n-instance.com"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>The full URL where your n8n builder is hosted. Don't include trailing slashes.</div>
                            </div>
                            <div className="modal-field" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>n8n API Key</label>
                                <input
                                    type="password"
                                    value={toolKeys?.n8nApiKey || ''}
                                    onChange={e => setToolKeys(prev => ({ ...prev, n8nApiKey: e.target.value }))}
                                    placeholder="n8n_api_..."
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)' }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Required for exporting and importing workflows. Generate this in your n8n Settings &gt; API.</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add/Edit Model Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
                        <h3>{form.id ? 'Edit Model' : 'Add Model'}</h3>

                        {/* Catalog dropdown */}
                        <div className="modal-field">
                            <label>Choose from catalog (or enter custom below)</label>
                            <input
                                value={catalogFilter}
                                onChange={e => setCatalogFilter(e.target.value)}
                                placeholder="Search models..."
                                style={{ marginBottom: 6 }}
                            />
                            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {filtered.map((item, i) => (
                                    <button key={i}
                                        onClick={() => selectFromCatalog(item)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                                            border: form.name === item.name ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                                            background: form.name === item.name ? 'var(--accent-glow)' : 'transparent',
                                            color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
                                            fontFamily: 'var(--font-sans)', textAlign: 'left', width: '100%',
                                        }}
                                    >
                                        <span style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700, flexShrink: 0 }}>
                                            {item.abbrev}
                                        </span>
                                        <span style={{ flex: 1 }}>{item.name}</span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.provider}</span>
                                        <span className="cap-tag">{TYPE_LABELS[item.type]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="modal-field">
                                <label>Model Name</label>
                                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. GPT-4o" />
                            </div>
                            <div className="modal-field">
                                <label>Model Type</label>
                                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
                                    <option value="text">Text / LLM</option>
                                    <option value="image">Image Generation</option>
                                    <option value="video">Video Generation</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-field">
                            <label>API Key</label>
                            <input type="password" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} placeholder="sk-... or AIza..." />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="modal-field">
                                <label>Base URL</label>
                                <input value={form.baseUrl} onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.openai.com" />
                            </div>
                            <div className="modal-field">
                                <label>Model Slug</label>
                                <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="gpt-4o" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="modal-field">
                                <label>Provider</label>
                                <input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} placeholder="OpenAI" />
                            </div>
                            <div className="modal-field">
                                <label>Color</label>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                    {MODEL_COLORS.map(c => (
                                        <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                                            style={{
                                                width: 20, height: 20, borderRadius: 4, backgroundColor: c, border: form.color === c ? '2px solid white' : '2px solid transparent',
                                                cursor: 'pointer',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="modal-btn primary" onClick={handleSave} disabled={!form.name || !form.apiKey}>
                                {form.id ? 'Save Changes' : 'Add Model'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
