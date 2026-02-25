import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

export default function ProjectsView() {
    const { projects, activeProjectId, setActiveProjectId, createProject, updateProject, deleteProject } = useProjects();
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', requirements: '', systemPrompt: '' });

    const openCreate = () => {
        setEditingProject(null);
        setForm({ name: '', description: '', requirements: '', systemPrompt: '' });
        setShowModal(true);
    };

    const openEdit = (project) => {
        setEditingProject(project);
        setForm({
            name: project.name,
            description: project.description || '',
            requirements: project.requirements || '',
            systemPrompt: project.systemPrompt || '',
        });
        setShowModal(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editingProject) {
            updateProject(editingProject.id, form);
        } else {
            createProject(form);
        }
        setShowModal(false);
    };

    return (
        <div className="projects-view">
            <div className="projects-header">
                <h1>Projects</h1>
                <button className="create-project-btn" onClick={openCreate}>
                    <Plus size={14} />
                    New Project
                </button>
            </div>

            <div className="projects-grid">
                {projects.map(project => (
                    <div
                        key={project.id}
                        className={`project-card ${project.id === activeProjectId ? 'active-project' : ''}`}
                        onClick={() => setActiveProjectId(project.id)}
                        onDoubleClick={() => openEdit(project)}
                    >
                        <div className="project-card-header">
                            <span className="project-card-name">{project.name}</span>
                        </div>
                        {project.description && (
                            <div className="project-card-desc">{project.description}</div>
                        )}
                        <div className="project-card-meta">
                            Created {new Date(project.created).toLocaleDateString()}
                            {project.id !== 'default' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                                    style={{ marginLeft: 12, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>{editingProject ? 'Edit Project' : 'New Project'}</h3>

                        <div className="modal-field">
                            <label>Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Project name"
                            />
                        </div>

                        <div className="modal-field">
                            <label>Description</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="What is this project about?"
                            />
                        </div>

                        <div className="modal-field">
                            <label>Requirements</label>
                            <textarea
                                value={form.requirements}
                                onChange={e => setForm(prev => ({ ...prev, requirements: e.target.value }))}
                                placeholder="Specific requirements or constraints..."
                            />
                        </div>

                        <div className="modal-field">
                            <label>Default System Prompt</label>
                            <textarea
                                value={form.systemPrompt}
                                onChange={e => setForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                placeholder="System instructions for all conversations in this project..."
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="modal-btn primary" onClick={handleSave}>
                                {editingProject ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
