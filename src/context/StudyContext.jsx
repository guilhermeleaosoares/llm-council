import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const StudyContext = createContext();

const API_BASE = 'http://localhost:3001/api';
const ACTIVE_NOTEBOOK_KEY = 'llm-council-active-notebook';

const DEFAULT_NOTEBOOK = {
    id: 'default-notebook',
    name: 'My First Notebook',
    systemPrompt: 'You are an expert study assistant. Help me understand the sources I provide.',
    sources: [], // { id, name, text, type }
    created: new Date().toISOString(),
};

export function StudyProvider({ children }) {
    const [notebooks, setNotebooks] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Attempt to parse local active id, fallback to 'default-notebook'
    const [activeNotebookId, setActiveNotebookId] = useState(
        () => localStorage.getItem(ACTIVE_NOTEBOOK_KEY) || 'default-notebook'
    );

    // Initial Fetch
    useEffect(() => {
        fetch(`${API_BASE}/notebooks`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setNotebooks(data);
                    if (!data.find(n => n.id === activeNotebookId)) {
                        setActiveNotebookId(data[0].id);
                    }
                } else {
                    setNotebooks([DEFAULT_NOTEBOOK]);
                    setActiveNotebookId(DEFAULT_NOTEBOOK.id);
                }
            })
            .catch(err => {
                console.error("Failed to load notebooks from server", err);
                setNotebooks([DEFAULT_NOTEBOOK]);
            })
            .finally(() => {
                setIsLoaded(true);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync to Server
    useEffect(() => {
        if (!isLoaded) return;
        fetch(`${API_BASE}/notebooks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notebooks)
        }).catch(err => console.error("Failed to save notebooks", err));
    }, [notebooks, isLoaded]);

    useEffect(() => {
        if (activeNotebookId) {
            localStorage.setItem(ACTIVE_NOTEBOOK_KEY, activeNotebookId);
        }
    }, [activeNotebookId]);

    const activeNotebook = notebooks.find(n => n.id === activeNotebookId) || notebooks[0];

    const createNotebook = useCallback((data) => {
        const notebook = {
            name: data.name || 'New Notebook',
            systemPrompt: data.systemPrompt || 'You are an expert study assistant.',
            sources: [],
            id: Date.now().toString(),
            created: new Date().toISOString(),
        };
        setNotebooks(prev => [notebook, ...prev]);
        setActiveNotebookId(notebook.id);
        return notebook;
    }, []);

    const updateNotebook = useCallback((id, updates) => {
        setNotebooks(prev => prev.map(n =>
            n.id === id ? { ...n, ...updates } : n
        ));
    }, []);

    const deleteNotebook = useCallback((id) => {
        if (notebooks.length <= 1) return; // Prevent deleting the last notebook
        setNotebooks(prev => prev.filter(n => n.id !== id));
        if (activeNotebookId === id) {
            const remaining = notebooks.filter(n => n.id !== id);
            setActiveNotebookId(remaining[0]?.id || null);
        }
    }, [activeNotebookId, notebooks.length]);

    const addSourceToNotebook = useCallback((notebookId, source) => {
        setNotebooks(prev => prev.map(n => {
            if (n.id === notebookId) {
                return {
                    ...n,
                    sources: [...n.sources, { ...source, id: Date.now().toString() }]
                };
            }
            return n;
        }));
    }, []);

    const removeSourceFromNotebook = useCallback((notebookId, sourceId) => {
        setNotebooks(prev => prev.map(n => {
            if (n.id === notebookId) {
                return {
                    ...n,
                    sources: n.sources.filter(s => s.id !== sourceId)
                };
            }
            return n;
        }));
    }, []);

    if (!isLoaded) return null; // Or a gentle loading spinner

    return (
        <StudyContext.Provider value={{
            notebooks,
            activeNotebook,
            activeNotebookId,
            setActiveNotebookId,
            createNotebook,
            updateNotebook,
            deleteNotebook,
            addSourceToNotebook,
            removeSourceFromNotebook
        }}>
            {children}
        </StudyContext.Provider>
    );
}

export const useStudy = () => useContext(StudyContext);

