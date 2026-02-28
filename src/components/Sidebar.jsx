import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Settings, Workflow, Plus, ChevronLeft, ChevronRight, FolderOpen, LogOut, Crown, MoreHorizontal, Edit2, Trash2, Library } from 'lucide-react';
import { useCouncil } from '../context/CouncilContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../auth/AuthContext';
import CouncilLogo from './CouncilLogo';

export default function Sidebar({ collapsed, setCollapsed }) {
    const location = useLocation();
    const { user, logout } = useAuth();
    const {
        conversations,
        activeConversationId,
        setActiveConversationId,
        createConversation,
        renameConversation,
        deleteConversation,
        models,
        enabledModels,
        kingModelId,
    } = useCouncil();
    const { activeProject, projects, setActiveProjectId } = useProjects();

    const [chatMenuId, setChatMenuId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [renameChatId, setRenameChatId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Keep activeConversationId synced to a valid chat in the current project
    useEffect(() => {
        if (location.pathname === '/' || location.pathname.startsWith('/chat')) {
            const projectChats = conversations.filter(c => c.projectId === activeProject?.id || (!c.projectId && activeProject?.id === 'default'));
            if (projectChats.length > 0) {
                if (!activeConversationId || !projectChats.find(c => c.id === activeConversationId)) {
                    setActiveConversationId(projectChats[0].id);
                }
            } else if (activeProject && conversations.length > 0) {
                // If the user has chats playing, but flipped to an empty project, prep a new blank one
                createConversation(activeProject.id, activeProject.systemPrompt);
            }
        }
    }, [activeProject, conversations, activeConversationId, location.pathname, setActiveConversationId, createConversation]);

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            <div className="sidebar-header">
                <div className="sidebar-logo"><CouncilLogo size={28} /></div>
                <span className="sidebar-title">Council</span>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MessageSquare size={16} /><span className="nav-label">Chat</span>
                </NavLink>
                <NavLink to="/study" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Library size={16} /><span className="nav-label">Study</span>
                </NavLink>
                <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FolderOpen size={16} /><span className="nav-label">Projects</span>
                </NavLink>
                <NavLink to="/automations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Workflow size={16} /><span className="nav-label">Automations</span>
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Settings size={16} /><span className="nav-label">Settings</span>
                </NavLink>
            </nav>

            {!collapsed && activeProject && (
                <div className="project-selector">
                    <div>
                        <div className="project-selector-label">Project</div>
                        <div className="project-selector-name">{activeProject.name}</div>
                    </div>
                </div>
            )}

            {location.pathname === '/' && (
                <div className="sidebar-chats">
                    <button className="new-chat-btn" onClick={() => createConversation(activeProject?.id, activeProject?.systemPrompt)}>
                        <Plus size={14} /><span className="new-chat-text">New Chat</span>
                    </button>
                    <div className="sidebar-section-title">Conversations</div>
                    {conversations
                        .filter(c => c.projectId === activeProject?.id || (!c.projectId && activeProject?.id === 'default'))
                        .map(conv => (
                            <div key={conv.id}
                                className={`chat-item ${conv.id === activeConversationId ? 'active' : ''}`}
                                onClick={() => setActiveConversationId(conv.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                    <MessageSquare size={12} style={{ flexShrink: 0 }} />
                                    <span className="chat-item-text">{conv.title}</span>
                                </div>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <button
                                        className="chat-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setChatMenuId(chatMenuId === conv.id ? null : conv.id);
                                        }}
                                        title="Chat options"
                                    >
                                        <MoreHorizontal size={14} />
                                    </button>
                                    {chatMenuId === conv.id && (
                                        <div className="chat-menu-dropdown" onMouseLeave={() => setChatMenuId(null)}>
                                            <button className="chat-menu-item" onClick={(e) => {
                                                e.stopPropagation();
                                                setRenameValue(conv.title);
                                                setRenameChatId(conv.id);
                                                setChatMenuId(null);
                                            }}>
                                                <Edit2 size={12} /> Rename
                                            </button>
                                            <button className="chat-menu-item danger" onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(conv.id);
                                                setChatMenuId(null);
                                            }}>
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Modals outside regular layout */}
            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
                        <h3 style={{ marginBottom: 10, color: 'var(--text-primary)' }}>Delete Chat?</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Are you sure you want to delete this conversation? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn" onClick={() => {
                                deleteConversation(deleteConfirmId);
                                setDeleteConfirmId(null);
                            }} style={{ background: '#ef4444', color: '#fff', border: 'none' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {renameChatId && (
                <div className="modal-overlay" onClick={() => setRenameChatId(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
                        <h3 style={{ marginBottom: 12, color: 'var(--text-primary)' }}>Rename Chat</h3>
                        <div className="modal-field">
                            <input
                                autoFocus
                                className="input-field"
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && renameValue.trim()) {
                                        renameConversation(renameChatId, renameValue.trim());
                                        setRenameChatId(null);
                                    }
                                }}
                                style={{ width: '100%', marginBottom: 20 }}
                                placeholder="Conversation title"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn secondary" onClick={() => setRenameChatId(null)}>Cancel</button>
                            <button className="btn primary" onClick={() => {
                                if (renameValue.trim()) {
                                    renameConversation(renameChatId, renameValue.trim());
                                    setRenameChatId(null);
                                }
                            }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="model-indicators">
                <div className="model-indicators-label">
                    {enabledModels.filter(m => m.type === 'text').length} text · {enabledModels.filter(m => m.type === 'image').length} image
                </div>
                <div className="model-dots">
                    {models.map(m => (
                        <div key={m.id}
                            className={`model-dot ${m.enabled && m.apiKey ? '' : 'inactive'}`}
                            style={{ backgroundColor: m.color, position: 'relative' }}
                            title={`${m.name} (${m.type})${m.id === kingModelId ? ' — King' : ''}`}
                        >
                            {m.id === kingModelId && (
                                <Crown size={5} style={{ position: 'absolute', top: -3, right: -3, color: 'var(--text-accent)' }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {user && (
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                        ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {(user.displayName || user.email || '?')[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <span className="user-name">{user.displayName || user.email}</span>
                    <button className="user-signout" onClick={logout} title="Sign out">
                        <LogOut size={14} />
                    </button>
                </div>
            )}
        </aside>
    );
}
