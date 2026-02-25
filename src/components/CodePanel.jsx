import { useState } from 'react';
import { X, Copy, Download, Send, Check } from 'lucide-react';

const LANGUAGES = [
    'javascript', 'typescript', 'python', 'html', 'css', 'json',
    'bash', 'sql', 'rust', 'go', 'java', 'c', 'cpp', 'ruby', 'swift', 'kotlin',
];

export default function CodePanel({ onClose, onSendToCouncil }) {
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleDownload = () => {
        const ext = { javascript: 'js', typescript: 'ts', python: 'py', bash: 'sh', cpp: 'cpp' }[language] || language;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Simple line numbers
    const lineCount = code.split('\n').length;

    return (
        <div className="side-panel">
            <div className="side-panel-header">
                <span className="side-panel-title">Code Editor</span>
                <div className="side-panel-actions">
                    <select
                        className="sp-lang-select"
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                    >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button className="sp-btn" onClick={handleCopy} title="Copy">
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <button className="sp-btn" onClick={handleDownload} title="Download">
                        <Download size={13} />
                    </button>
                    <button className="sp-btn" onClick={onClose}><X size={14} /></button>
                </div>
            </div>

            <div className="code-editor-body">
                <div className="code-line-numbers">
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>
                <textarea
                    className="code-textarea"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder={`// Write ${language} code here...`}
                    spellCheck={false}
                />
            </div>

            <button
                className="sp-council-btn"
                onClick={() => onSendToCouncil(code, language)}
                disabled={!code.trim()}
            >
                <Send size={13} /> Run through Council
            </button>
        </div>
    );
}
