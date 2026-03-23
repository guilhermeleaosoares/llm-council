import { createContext, useContext, useState, useCallback } from 'react';

const SkillsContext = createContext();
const SKILLS_KEY = 'llm-council-skills';

function loadSkills() {
    try {
        const s = localStorage.getItem(SKILLS_KEY);
        return s ? JSON.parse(s) : [];
    } catch { return []; }
}

function persist(skills) {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
}

export function SkillsProvider({ children }) {
    const [skills, setSkills] = useState(loadSkills);

    const mutate = useCallback((updater) => {
        setSkills(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            persist(next);
            return next;
        });
    }, []);

    const addSkill = useCallback((skill) => {
        const s = {
            ...skill,
            id: Date.now().toString(),
            enabled: true,
            created: new Date().toISOString(),
        };
        mutate(prev => [...prev, s]);
        return s;
    }, [mutate]);

    const updateSkill = useCallback((id, updates) => {
        mutate(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }, [mutate]);

    const removeSkill = useCallback((id) => {
        mutate(prev => prev.filter(s => s.id !== id));
    }, [mutate]);

    const toggleSkill = useCallback((id) => {
        mutate(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    }, [mutate]);

    const importSkills = useCallback((incoming, mode = 'merge') => {
        mutate(prev => {
            const base = mode === 'replace' ? [] : prev;
            const newIds = new Set(base.map(s => s.id));
            const toAdd = incoming
                .filter(s => s.name && s.systemPrompt)
                .map(s => ({ ...s, id: newIds.has(s.id) ? Date.now().toString() + Math.random() : (s.id || Date.now().toString()), enabled: s.enabled !== false, created: s.created || new Date().toISOString() }));
            return [...base, ...toAdd];
        });
    }, [mutate]);

    const getEnabledSkillsPrompt = useCallback(() => {
        const enabled = skills.filter(s => s.enabled);
        if (!enabled.length) return '';
        return enabled.map(s => `[SKILL: ${s.name}]\n${s.systemPrompt}`).join('\n\n');
    }, [skills]);

    return (
        <SkillsContext.Provider value={{
            skills,
            addSkill,
            updateSkill,
            removeSkill,
            toggleSkill,
            importSkills,
            getEnabledSkillsPrompt,
        }}>
            {children}
        </SkillsContext.Provider>
    );
}

export const useSkills = () => useContext(SkillsContext);
