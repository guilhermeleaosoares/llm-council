import { useState, useEffect, useRef } from 'react';
import { X, Eye, Edit3, Save, Download, Send } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const DOCS_KEY = 'llm-council-canvas-docs';

export default function CanvasPanel({ onClose, onSendToCouncil, incomingContent, incomingId }) {
    const [docs, setDocs] = useState(() => {
        try { return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]'); } catch { return []; }
    });
    const [activeDocId, setActiveDocId] = useState(null);
    const [title, setTitle] = useState('Untitled');
    const [content, setContent] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const lastIncomingRef = useRef(null);

    // Auto-populate canvas when AI sends content here
    useEffect(() => {
        if (incomingContent && incomingId && incomingId !== lastIncomingRef.current) {
            lastIncomingRef.current = incomingId;
            setContent(incomingContent);
            setTitle('AI Response');
            setPreviewMode(true);
            // Auto-save as a new doc
            const id = Date.now().toString();
            const doc = { id, title: 'AI Response', content: incomingContent, updated: new Date().toISOString() };
            setDocs(prev => [doc, ...prev]);
            setActiveDocId(id);
        }
    }, [incomingContent, incomingId]);

    useEffect(() => {
        localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    }, [docs]);

    const activeDoc = docs.find(d => d.id === activeDocId);

    const handleNew = () => {
        const id = Date.now().toString();
        const doc = { id, title: 'Untitled', content: '', updated: new Date().toISOString() };
        setDocs(prev => [doc, ...prev]);
        setActiveDocId(id);
        setTitle('Untitled');
        setContent('');
        setPreviewMode(false);
    };

    const handleSave = () => {
        if (!activeDocId) {
            handleNew();
            return;
        }
        setDocs(prev => prev.map(d =>
            d.id === activeDocId ? { ...d, title, content, updated: new Date().toISOString() } : d
        ));
    };

    const handleOpen = (doc) => {
        setActiveDocId(doc.id);
        setTitle(doc.title);
        setContent(doc.content);
        setPreviewMode(false);
    };

    const handleDelete = (id) => {
        setDocs(prev => prev.filter(d => d.id !== id));
        if (activeDocId === id) {
            setActiveDocId(null);
            setTitle('Untitled');
            setContent('');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'document'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="side-panel">
            <div className="side-panel-header">
                <span className="side-panel-title">Canvas</span>
                <div className="side-panel-actions">
                    <button className="sp-btn" onClick={handleNew} title="New document">+</button>
                    <button className="sp-btn" onClick={handleSave} title="Save"><Save size={13} /></button>
                    <button className="sp-btn" onClick={handleDownload} title="Download"><Download size={13} /></button>
                    <button className="sp-btn" onClick={() => setPreviewMode(!previewMode)} title={previewMode ? 'Edit' : 'Preview'}>
                        {previewMode ? <Edit3 size={13} /> : <Eye size={13} />}
                    </button>
                    <button className="sp-btn" onClick={onClose}><X size={14} /></button>
                </div>
            </div>

            {/* Document list */}
            {docs.length > 0 && !activeDocId && (
                <div className="sp-doc-list">
                    {docs.map(d => (
                        <div key={d.id} className="sp-doc-item" onClick={() => handleOpen(d)}>
                            <span>{d.title}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="sp-doc-del">&times;</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Editor */}
            <div className="sp-editor">
                <input
                    className="sp-title-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Document title..."
                />
                {previewMode ? (
                    <div className="sp-preview">
                        <MarkdownRenderer content={content} />
                    </div>
                ) : (
                    <textarea
                        className="sp-textarea"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Write markdown here..."
                    />
                )}
            </div>

            <button
                className="sp-council-btn"
                onClick={() => { handleSave(); onSendToCouncil(content); }}
                disabled={!content.trim()}
            >
                <Send size={13} /> Ask Council about this document
            </button>
        </div>
    );
}
