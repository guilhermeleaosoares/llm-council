import { useState, useRef } from 'react';
import { useStudy } from '../../context/StudyContext';
import { Settings, FileText, Trash2, Edit2, Plus, Globe, FolderHeart, Link as LinkIcon } from 'lucide-react';
import WebSearchPanel from './WebSearchPanel';

const API_BASE = 'http://localhost:3001/api';

export default function SourceManager() {
    const {
        notebooks,
        activeNotebook,
        activeNotebookId,
        setActiveNotebookId,
        createNotebook,
        updateNotebook,
        addSourceToNotebook,
        removeSourceFromNotebook,
        deleteNotebook
    } = useStudy();

    const [isEditingGuidelines, setIsEditingGuidelines] = useState(false);
    const [guidelinesText, setGuidelinesText] = useState('');
    const [activeTab, setActiveTab] = useState('sources'); // 'sources' or 'search'
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!activeNotebook) return null;

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length || !activeNotebook) return;
        setIsUploading(true);

        try {
            for (const file of files) {
                let text = '';
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    const pdfjsLib = await import('pdfjs-dist');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        text += textContent.items.map(item => item.str).join(' ') + '\n\n';
                    }
                } else {
                    text = await file.text();
                }

                addSourceToNotebook(activeNotebook.id, {
                    name: file.name,
                    text: text || '(Empty file)',
                    type: file.type.includes('pdf') ? 'PDF' : file.name.split('.').pop().toUpperCase() || 'TXT',
                    preview: text.substring(0, 50) + '...'
                });
            }
        } catch (err) {
            alert('Failed to read file: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddUrl = async () => {
        const url = prompt('Enter a web URL to add as a source:');
        if (!url) return;
        setIsUploading(true);
        try {
            const res = await fetch(`${API_BASE}/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            addSourceToNotebook(activeNotebook.id, {
                name: data.title || url,
                text: `Title: ${data.title}\nURL: ${url}\n\nContent:\n${data.text}`,
                type: 'WEB',
                preview: data.text?.substring(0, 50) + '...',
                url: url
            });
        } catch (err) {
            alert('Failed to read URL: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveGuidelines = () => {
        updateNotebook(activeNotebook.id, { systemPrompt: guidelinesText });
        setIsEditingGuidelines(false);
    };

    return (
        <div className="source-manager" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', width: '320px', minWidth: '320px' }}>

            {/* Header: Notebook Selection */}
            <div style={{ padding: '20px 20px 15px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderHeart size={16} color="var(--accent)" /> Notebooks
                    </h2>
                    <button onClick={() => createNotebook({ name: 'New Notebook' })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="New Notebook">
                        <Plus size={16} />
                    </button>
                </div>

                <select
                    value={activeNotebookId}
                    onChange={e => setActiveNotebookId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', marginBottom: '10px' }}
                >
                    {notebooks.map(n => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                </select>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-glass)', color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => {
                        const newName = prompt('New name:', activeNotebook.name);
                        if (newName) updateNotebook(activeNotebook.id, { name: newName });
                    }}><Edit2 size={12} /> Rename</button>

                    <button style={{ flex: 1, padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--danger)', background: 'var(--danger-glow)', color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => {
                        if (confirm('Delete notebook?')) deleteNotebook(activeNotebook.id);
                    }} disabled={notebooks.length === 1}><Trash2 size={12} /> Delete</button>
                </div>
            </div>

            {/* Guidelines / System Prompt section */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={12} /> Guidelines
                    </h3>
                    <button onClick={() => {
                        setGuidelinesText(activeNotebook.systemPrompt);
                        setIsEditingGuidelines(!isEditingGuidelines);
                    }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                        <Edit2 size={12} />
                    </button>
                </div>

                {isEditingGuidelines ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                            value={guidelinesText}
                            onChange={(e) => setGuidelinesText(e.target.value)}
                            style={{ height: '80px', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', fontFamily: 'var(--font-sans)', outline: 'none' }}
                            placeholder="e.g. You are an expert tutor. Explain concepts simply."
                        />
                        <button style={{ alignSelf: 'flex-end', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }} onClick={handleSaveGuidelines}>Save</button>
                    </div>
                ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', minHeight: '40px', lineHeight: 1.5 }}>
                        {activeNotebook.systemPrompt || <span style={{ opacity: 0.5 }}>No guidelines set. The Council will use default behavior.</span>}
                    </div>
                )}
            </div>

            {/* Tabs for Sources / Web Search */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                    onClick={() => setActiveTab('sources')}
                    style={{ flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: activeTab === 'sources' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'sources' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}
                >
                    <FileText size={14} /> Sources
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    style={{ flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: activeTab === 'search' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'search' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}
                >
                    <Globe size={14} /> Web Search
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'sources' ? (
                <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {activeNotebook.sources.length} sources attached
                        </span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            multiple
                            accept=".txt,.md,.json,.csv,.pdf"
                            onChange={handleFileUpload}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleAddUrl} disabled={isUploading} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: isUploading ? 0.6 : 1 }} title="Paste Web URL">
                                <LinkIcon size={12} /> Add URL
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', color: 'var(--text-accent)', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: isUploading ? 0.6 : 1 }} title="Upload File">
                                {isUploading ? <span className="spin" style={{ display: 'inline-block' }}>↻</span> : <Plus size={12} />} {isUploading ? 'Reading...' : 'Upload File'}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeNotebook.sources.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                                No sources added yet.<br /><br />Click the button above to upload PDF or Text files, or use the Web Search tab to find articles.
                            </div>
                        ) : (
                            activeNotebook.sources.map(source => (
                                <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                                    <div style={{ overflow: 'hidden', flex: 1, paddingRight: '10px' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{source.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{source.type}</div>
                                    </div>
                                    <button onClick={() => removeSourceFromNotebook(activeNotebook.id, source.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-glow)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <WebSearchPanel notebook={activeNotebook} />
                </div>
            )}
        </div>
    );
}
