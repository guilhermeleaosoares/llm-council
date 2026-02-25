import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as fbSignOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
} from 'firebase/auth';

// ── Firebase config ──
// To enable real Google OAuth:
// 1. Create a project at https://console.firebase.google.com
// 2. Enable Google sign-in under Authentication → Sign-in methods
// 3. Create a .env file in the project root with these values:
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app, auth, provider;
let firebaseReady = false;

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        setPersistence(auth, browserLocalPersistence);
        firebaseReady = true;
        console.log('Firebase initialized with real auth');
    } else {
        console.warn('Firebase not configured — running in dev mode (set VITE_FIREBASE_* in .env)');
    }
} catch (e) {
    console.warn('Firebase init failed:', e.message);
}

export const isFirebaseConfigured = () => firebaseReady;

export async function signInWithGoogle() {
    if (!firebaseReady) {
        // Dev mode: create a persistent dev user
        const devUser = {
            uid: 'dev-user-' + Date.now(),
            displayName: 'Developer',
            email: 'dev@local',
            photoURL: null,
        };
        localStorage.setItem('llm-council-dev-user', JSON.stringify(devUser));
        return devUser;
    }

    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (err) {
        if (err.code === 'auth/popup-blocked') {
            throw new Error('Popup blocked — please allow popups for this site');
        }
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
            throw new Error('Sign-in cancelled');
        }
        throw err;
    }
}

export async function signOut() {
    if (!firebaseReady) {
        localStorage.removeItem('llm-council-dev-user');
        return;
    }
    await fbSignOut(auth);
}

export function onAuthChange(callback) {
    if (!firebaseReady) {
        const saved = localStorage.getItem('llm-council-dev-user');
        if (saved) {
            try { callback(JSON.parse(saved)); } catch { callback(null); }
        } else {
            callback(null);
        }
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}
