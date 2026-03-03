import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function GuestDisclaimer() {
    const { isGuest, logout } = useAuth();
    const [hidden, setHidden] = useState(false);

    if (!isGuest || hidden) return null;

    return (
        <div className="guest-disclaimer">
            <div className="guest-text">
                <span className="guest-label">Guest Mode:</span>
                Conversations are not saved to the cloud.
                <button className="text-link" onClick={() => logout()}>Sign In</button>
            </div>
            <button className="guest-close" onClick={() => setHidden(true)} title="Dismiss">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
            </button>
        </div>
    );
}
