import React, { useState } from 'react';
import { Layers, Brain, CheckSquare, MoreVertical, Edit2, Trash2, X } from 'lucide-react';

export default function ArtifactHistory({
    type,
    items,
    onSelect,
    onDelete,
    onRename,
    onCreateNew,
    icon: Icon = Layers
}) {
    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const title = type === 'mindmap' ? 'Mindmap History' : type === 'quiz' ? 'Quiz History' : 'Flashcard Sets';
    const newBtnText = type === 'mindmap' ? '+ New Mindmap' : type === 'quiz' ? '+ New Quiz' : '+ New Flashcards';

    const handleRenameSubmit = (id, e) => {
        e?.preventDefault();
        if (editName.trim()) {
            onRename(id, editName.trim());
        }
        setEditingId(null);
        setEditName('');
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={24} /> {title}
                </h2>
                <button className="btn" onClick={onCreateNew}>
                    {newBtnText}
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {items?.map((item) => (
                    <div
                        key={item.id}
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease', position: 'relative' }}
                    >
                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => editingId !== item.id && onSelect(item.id)}>
                            {editingId === item.id ? (
                                <form onSubmit={(e) => handleRenameSubmit(item.id, e)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="input-field"
                                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', padding: '5px 10px', outline: 'none', fontSize: '16px', fontWeight: 600 }}
                                    />
                                    <button type="submit" className="btn secondary" style={{ padding: '5px 10px' }} onClick={(e) => e.stopPropagation()}>Save</button>
                                    <button type="button" className="btn secondary" style={{ padding: '5px' }} onClick={(e) => { e.stopPropagation(); setEditingId(null); setEditName(''); }}>
                                        <X size={16} />
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px', marginBottom: '5px' }}>
                                        {item.name || (type === 'quiz' ? `${item.length || 0} Questions • ${item.difficulty || 'Mixed'}` : `${new Date(item.timestamp).toLocaleDateString()} at ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {item.prompt || (type === 'quiz' ? new Date(item.timestamp).toLocaleString() : "Default Setup")}
                                        {type === 'flashcard' && item.count && ` • ${item.count} Cards`}
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button className="btn secondary" onClick={() => onSelect(item.id)}>
                                {type === 'quiz' ? 'Resume' : 'View'}
                            </button>

                            <div style={{ position: 'relative' }}>
                                <button
                                    className="btn secondary"
                                    style={{ padding: '8px', border: 'none', background: 'transparent' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                                    }}
                                >
                                    <MoreVertical size={18} />
                                </button>

                                {openMenuId === item.id && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                        />
                                        <div style={{
                                            position: 'absolute', right: 0, top: '100%', marginTop: '5px',
                                            backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px',
                                            boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: '150px',
                                            display: 'flex', flexDirection: 'column', padding: '5px'
                                        }}>
                                            <button
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingId(item.id);
                                                    setEditName(item.name || (type === 'quiz' ? `${item.length} Questions` : new Date(item.timestamp).toLocaleString()));
                                                    setOpenMenuId(null);
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Edit2 size={16} /> Rename
                                            </button>
                                            <button
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(item.id);
                                                    setOpenMenuId(null);
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Trash2 size={16} /> Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
