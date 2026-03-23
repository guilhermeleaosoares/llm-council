import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Download, Upload, Save, Trash2, Package, FolderOpen, ChevronDown, ChevronUp, Plus, Check, AlertTriangle } from 'lucide-react';
import { useSkills } from '../context/SkillsContext';
import { useProjects } from '../context/ProjectContext';
import { useCouncil } from '../context/CouncilContext';

const BUNDLES_KEY = 'llm-council-config-bundles';

function loadBundles() {
    try {
        const s = localStorage.getItem(BUNDLES_KEY);
        return s ? JSON.parse(s) : [];
    } catch { return []; }
}
function saveBundles(b) { localStorage.setItem(BUNDLES_KEY, JSON.stringify(b)); }

function cleanJSON(str) {
    return str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export default function ConfigsView() {
    const { skills, importSkills } = useSkills();
    const { projects, importProjects } = useProjects();
    const { models, importModels } = useCouncil();

    const [bundles, setBundles] = useState(loadBundles);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [bundleName, setBundleName] = useState('');
    const [bundleDesc, setBundleDesc] = useState('');
    const [expandedBundle, setExpandedBundle] = useState(null);
    const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
    const [toast, setToast] = useState(null);
    const [importPreview, setImportPreview] = useState(null); // { skills, projects, models }
    const fileInputRef = useRef(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Save current state as a bundle ──
    const saveBundle = () => {
        if (!bundleName.trim()) return;
        const bundle = {
            id: Date.now().toString(),
            name: bundleName.trim(),
            description: bundleDesc.trim(),
            created: new Date().toISOString(),
            data: {
                skills: skills.map(({ ...s }) => s),
                projects: projects.map(({ ...p }) => p),
            },
        };
        const next = [bundle, ...bundles];
        setBundles(next);
        saveBundles(next);
        setShowSaveModal(false);
        setBundleName('');
        setBundleDesc('');
        showToast('Config bundle saved');
    };

    const deleteBundle = (id) => {
        const next = bundles.filter(b => b.id !== id);
        setBundles(next);
        saveBundles(next);
    };

    const loadBundle = (bundle) => {
        if (!window.confirm(`Load bundle "${bundle.name}"?\nThis will ${importMode === 'replace' ? 'REPLACE' : 'merge with'} your current skills and projects.`)) return;
        if (bundle.data.skills?.length) importSkills(bundle.data.skills, importMode);
        if (bundle.data.projects?.length) importProjects(bundle.data.projects, importMode);
        showToast(`Bundle "${bundle.name}" loaded`);
    };

    // ── ZIP Export ──
    const exportZip = async () => {
        const zip = new JSZip();
        zip.file('skills.json', JSON.stringify(skills, null, 2));
        zip.file('projects.json', JSON.stringify(projects, null, 2));
        // Models exported without API keys for safety
        const safeModels = models.map(({ apiKey, ...m }) => ({ ...m, apiKey: '' }));
        zip.file('models.json', JSON.stringify(safeModels, null, 2));
        zip.file('README.md', `# LLM Council Config Export\n\nGenerated: ${new Date().toLocaleString()}\n\n## Contents\n- \`skills.json\` — ${skills.length} skills\n- \`projects.json\` — ${projects.length} projects\n- \`models.json\` — ${models.length} model configs (API keys removed for security)\n\n## Import\nUse the "Import ZIP" button in LLM Council > Config Manager to restore these configs.\n`);

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llm-council-config-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Config exported as ZIP');
    };

    // ── JSON-only exports ──
    const exportJSON = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`${filename} downloaded`);
    };

    // ── ZIP / JSON Import ──
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';

        try {
            if (file.name.endsWith('.zip')) {
                const zip = await JSZip.loadAsync(file);
                const preview = {};

                const skillsFile = zip.file('skills.json');
                if (skillsFile) {
                    const text = await skillsFile.async('text');
                    try { preview.skills = JSON.parse(cleanJSON(text)); } catch {}
                }
                const projectsFile = zip.file('projects.json');
                if (projectsFile) {
                    const text = await projectsFile.async('text');
                    try { preview.projects = JSON.parse(cleanJSON(text)); } catch {}
                }
                const modelsFile = zip.file('models.json');
                if (modelsFile) {
                    const text = await modelsFile.async('text');
                    try { preview.models = JSON.parse(cleanJSON(text)); } catch {}
                }
                setImportPreview(preview);
            } else if (file.name.endsWith('.json')) {
                const text = await file.text();
                const parsed = JSON.parse(cleanJSON(text));
                // Detect what kind of JSON this is
                if (Array.isArray(parsed)) {
                    const first = parsed[0];
                    if (first?.systemPrompt !== undefined) setImportPreview({ skills: parsed });
                    else if (first?.slug !== undefined || first?.baseUrl !== undefined) setImportPreview({ models: parsed });
                    else if (first?.description !== undefined || first?.requirements !== undefined) setImportPreview({ projects: parsed });
                    else setImportPreview({ skills: parsed }); // fallback guess
                } else if (parsed.skills || parsed.projects || parsed.models) {
                    setImportPreview(parsed);
                } else {
                    showToast('Unrecognized JSON format', 'error');
                }
            } else {
                showToast('Please select a .zip or .json file', 'error');
            }
        } catch (err) {
            showToast(`Import failed: ${err.message}`, 'error');
        }
    };

    const applyImport = () => {
        if (!importPreview) return;
        if (importPreview.skills?.length) importSkills(importPreview.skills, importMode);
        if (importPreview.projects?.length) importProjects(importPreview.projects, importMode);
        if (importPreview.models?.length) importModels(importPreview.models);
        const counts = [
            importPreview.skills?.length && `${importPreview.skills.length} skills`,
            importPreview.projects?.length && `${importPreview.projects.length} projects`,
            importPreview.models?.length && `${importPreview.models.length} models`,
        ].filter(Boolean).join(', ');
        showToast(`Imported: ${counts}`);
        setImportPreview(null);
    };

    const enabledSkills = skills.filter(s => s.enabled).length;

    return (
        <div className="configs-view">
            {/* Toast */}
            {toast && (
                <div className={`configs-toast ${toast.type}`}>
                    {toast.type === 'error' ? <AlertTriangle size={13} /> : <Check size={13} />}
                    {toast.msg}
                </div>
            )}

            <div className="configs-header">
                <div>
                    <h1>Config Manager</h1>
                    <p className="configs-subtitle">
                        Save, export, and import your skills, projects, and model configs.
                        <span className="configs-stat">{skills.length} skills · {projects.length} projects · {models.length} models</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn secondary configs-btn" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={13} /> Import
                    </button>
                    <button className="btn primary configs-btn" onClick={exportZip}>
                        <Download size={13} /> Export ZIP
                    </button>
                    <input ref={fileInputRef} type="file" accept=".zip,.json" style={{ display: 'none' }} onChange={handleFileSelect} />
                </div>
            </div>

            {/* ── Import Preview ── */}
            {importPreview && (
                <div className="configs-card import-preview-card">
                    <div className="configs-card-title">
                        <FolderOpen size={15} style={{ color: 'var(--accent)' }} />
                        Import Preview
                    </div>
                    <div className="import-preview-stats">
                        {importPreview.skills?.length > 0 && <span className="configs-badge">{importPreview.skills.length} skills</span>}
                        {importPreview.projects?.length > 0 && <span className="configs-badge">{importPreview.projects.length} projects</span>}
                        {importPreview.models?.length > 0 && <span className="configs-badge">{importPreview.models.length} models (API keys not included)</span>}
                    </div>
                    <div className="import-mode-row">
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Import mode:</span>
                        <label className="import-mode-opt">
                            <input type="radio" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
                            Merge (add to existing)
                        </label>
                        <label className="import-mode-opt">
                            <input type="radio" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
                            Replace (overwrite existing)
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button className="btn secondary configs-btn" onClick={() => setImportPreview(null)}>Cancel</button>
                        <button className="btn primary configs-btn" onClick={applyImport}>
                            <Check size={13} /> Apply Import
                        </button>
                    </div>
                </div>
            )}

            {/* ── Quick Exports ── */}
            <div className="configs-card">
                <div className="configs-card-title">
                    <Download size={15} style={{ color: 'var(--accent)' }} />
                    Quick Export
                </div>
                <div className="quick-export-row">
                    <button className="quick-export-btn" onClick={exportZip}>
                        <Package size={16} />
                        <div>
                            <div className="quick-export-label">Full ZIP</div>
                            <div className="quick-export-sub">Skills + projects + model configs</div>
                        </div>
                        <Download size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                    </button>
                    <button className="quick-export-btn" onClick={() => exportJSON(skills, 'skills.json')}>
                        <span style={{ fontSize: 20 }}>⚡</span>
                        <div>
                            <div className="quick-export-label">Skills only</div>
                            <div className="quick-export-sub">{skills.length} skills ({enabledSkills} active)</div>
                        </div>
                        <Download size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                    </button>
                    <button className="quick-export-btn" onClick={() => exportJSON(projects, 'projects.json')}>
                        <FolderOpen size={20} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                            <div className="quick-export-label">Projects only</div>
                            <div className="quick-export-sub">{projects.length} projects</div>
                        </div>
                        <Download size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                    </button>
                    <button className="quick-export-btn" onClick={() => exportJSON(models.map(({ apiKey, ...m }) => ({ ...m, apiKey: '' })), 'models.json')}>
                        <span style={{ fontSize: 20 }}>🤖</span>
                        <div>
                            <div className="quick-export-label">Models only</div>
                            <div className="quick-export-sub">{models.length} models (no API keys)</div>
                        </div>
                        <Download size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                    </button>
                </div>
            </div>

            {/* ── Saved Bundles ── */}
            <div className="configs-card">
                <div className="configs-card-title" style={{ marginBottom: 14 }}>
                    <Save size={15} style={{ color: 'var(--accent)' }} />
                    Saved Bundles
                    <button
                        className="btn primary configs-btn"
                        style={{ marginLeft: 'auto', fontSize: 11 }}
                        onClick={() => setShowSaveModal(true)}
                    >
                        <Plus size={12} /> Save current
                    </button>
                </div>

                {bundles.length === 0 ? (
                    <div className="configs-empty">
                        <Save size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>No saved bundles</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Save a snapshot of your current skills and projects to restore later.</div>
                    </div>
                ) : (
                    <div className="bundles-list">
                        {bundles.map(bundle => (
                            <div key={bundle.id} className="bundle-row">
                                <div className="bundle-info" onClick={() => setExpandedBundle(expandedBundle === bundle.id ? null : bundle.id)}>
                                    <div className="bundle-name">
                                        <Package size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                        {bundle.name}
                                        {expandedBundle === bundle.id ? <ChevronUp size={12} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} /> : <ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />}
                                    </div>
                                    <div className="bundle-meta">
                                        {new Date(bundle.created).toLocaleString()} ·
                                        {bundle.data.skills?.length || 0} skills ·
                                        {bundle.data.projects?.length || 0} projects
                                    </div>
                                    {bundle.description && <div className="bundle-desc">{bundle.description}</div>}
                                </div>
                                {expandedBundle === bundle.id && (
                                    <div className="bundle-expanded">
                                        <div className="import-mode-row" style={{ marginBottom: 10 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Load mode:</span>
                                            <label className="import-mode-opt">
                                                <input type="radio" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
                                                Merge
                                            </label>
                                            <label className="import-mode-opt">
                                                <input type="radio" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
                                                Replace
                                            </label>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn primary configs-btn" onClick={() => loadBundle(bundle)}>
                                                <FolderOpen size={12} /> Load Bundle
                                            </button>
                                            <button className="btn secondary configs-btn" onClick={() => {
                                                const zip = new JSZip();
                                                zip.file('skills.json', JSON.stringify(bundle.data.skills || [], null, 2));
                                                zip.file('projects.json', JSON.stringify(bundle.data.projects || [], null, 2));
                                                zip.generateAsync({ type: 'blob' }).then(blob => {
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `${bundle.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                });
                                            }}>
                                                <Download size={12} /> Export
                                            </button>
                                            <button className="btn secondary configs-btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginLeft: 'auto' }} onClick={() => deleteBundle(bundle.id)}>
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Save Bundle Modal ── */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3>Save Config Bundle</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                            Saves a snapshot of your current {skills.length} skills and {projects.length} projects.
                            Model API keys are not included for security.
                        </p>
                        <div className="modal-field">
                            <label>Bundle name</label>
                            <input
                                autoFocus
                                className="input-field"
                                value={bundleName}
                                onChange={e => setBundleName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveBundle()}
                                placeholder="e.g. Work setup, Writing mode…"
                            />
                        </div>
                        <div className="modal-field">
                            <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                className="input-field"
                                value={bundleDesc}
                                onChange={e => setBundleDesc(e.target.value)}
                                placeholder="What's in this bundle?"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="modal-btn secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
                            <button className="modal-btn primary" disabled={!bundleName.trim()} onClick={saveBundle}>Save Bundle</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
