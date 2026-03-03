import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithGoogle, signOut, onAuthChange, isFirebaseConfigured } from './firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(() => {
        return localStorage.getItem('llm-council-is-guest') === 'true';
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsub = onAuthChange((u) => {
            setUser(u);
            if (u) setIsGuest(false);
            setLoading(false);
        });
        return unsub;
    }, []);

    const login = useCallback(async () => {
        setError(null);
        try {
            const u = await signInWithGoogle();
            setUser(u);
            setIsGuest(false);
            localStorage.removeItem('llm-council-is-guest');
        } catch (err) {
            setError(err.message);
            console.error('Login failed:', err);
        }
    }, []);

    const continueAsGuest = useCallback(() => {
        setIsGuest(true);
        localStorage.setItem('llm-council-is-guest', 'true');
    }, []);

    const logout = useCallback(async () => {
        await signOut();
        setUser(null);
        setIsGuest(false);
        localStorage.removeItem('llm-council-is-guest');
        // Clear session data but keep model config in localStorage as requested
        sessionStorage.clear();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            isGuest,
            loading,
            error,
            login,
            logout,
            continueAsGuest,
            isConfigured: isFirebaseConfigured(),
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
