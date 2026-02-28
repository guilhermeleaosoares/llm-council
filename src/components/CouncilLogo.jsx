// Minimalist geometric logo — interlocking circles representing the council
export default function CouncilLogo({ size = 28, ...props }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <circle cx="16" cy="10" r="6" stroke="#e5a84b" strokeWidth="1.5" fill="none" opacity="0.9" />
            <circle cx="10" cy="20" r="6" stroke="#8a8a8a" strokeWidth="1.5" fill="none" opacity="0.6" />
            <circle cx="22" cy="20" r="6" stroke="#5bb8a6" strokeWidth="1.5" fill="none" opacity="0.6" />
            <circle cx="16" cy="16" r="2" fill="#e5a84b" opacity="0.8" />
        </svg>
    );
}
