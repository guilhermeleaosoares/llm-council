import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithGoogle, signOut, onAuthChange, isFirebaseConfigured } from './firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsub = onAuthChange((u) => {
            setUser(u);
            setLoading(false);
        });
        return unsub;
    }, []);

    const login = useCallback(async () => {
        setError(null);
        try {
            const u = await signInWithGoogle();
            setUser(u);
        } catch (err) {
            setError(err.message);
            console.error('Login failed:', err);
        }
    }, []);

    const logout = useCallback(async () => {
        await signOut();
        setUser(null);
        // Clear all user data from localStorage on sign out
        const keys = Object.keys(localStorage).filter(k => k.startsWith('llm-council-'));
        keys.forEach(k => localStorage.removeItem(k));
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            login,
            logout,
            isConfigured: isFirebaseConfigured(),
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
