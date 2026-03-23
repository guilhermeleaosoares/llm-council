import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectContext = createContext();

const STORAGE_KEY = 'llm-council-projects';

const DEFAULT_PROJECT = {
    id: 'default',
    name: 'Default Project',
    description: 'General purpose council workspace',
    requirements: '',
    systemPrompt: '',
    created: new Date().toISOString(),
};

function loadProjects() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [DEFAULT_PROJECT];
    } catch { return [DEFAULT_PROJECT]; }
}

function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function ProjectProvider({ children }) {
    const [projects, setProjects] = useState(loadProjects);
    const [activeProjectId, setActiveProjectId] = useState(
        () => localStorage.getItem('llm-council-active-project') || 'default'
    );

    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

    useEffect(() => {
        saveProjects(projects);
    }, [projects]);

    useEffect(() => {
        localStorage.setItem('llm-council-active-project', activeProjectId);
    }, [activeProjectId]);

    const createProject = useCallback((data) => {
        const project = {
            ...data,
            id: Date.now().toString(),
            created: new Date().toISOString(),
        };
        setProjects(prev => [project, ...prev]);
        setActiveProjectId(project.id);
        return project;
    }, []);

    const updateProject = useCallback((id, updates) => {
        setProjects(prev => prev.map(p =>
            p.id === id ? { ...p, ...updates } : p
        ));
    }, []);

    const importProjects = useCallback((incoming, mode = 'merge') => {
        setProjects(prev => {
            const base = mode === 'replace' ? [DEFAULT_PROJECT] : prev;
            const existingIds = new Set(base.map(p => p.id));
            const toAdd = incoming
                .filter(p => p.name && p.id !== 'default')
                .map(p => ({ ...p, id: existingIds.has(p.id) ? Date.now().toString() + Math.random() : (p.id || Date.now().toString()), created: p.created || new Date().toISOString() }));
            return [...base, ...toAdd];
        });
    }, []);

    const deleteProject = useCallback((id) => {
        if (id === 'default') return;
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) setActiveProjectId('default');
    }, [activeProjectId]);

    return (
        <ProjectContext.Provider value={{
            projects,
            activeProject,
            activeProjectId,
            setActiveProjectId,
            createProject,
            updateProject,
            deleteProject,
            importProjects,
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export const useProjects = () => useContext(ProjectContext);
