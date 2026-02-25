import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

// Strip leading emoji clusters from text (e.g. "🔹 Title" → "Title")
const EMOJI_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\u2600-\u27bf\u2b50\u2728\u2705\u274c\u26a0\u2139\u2022\u25b6\u25c0\u2764\u2611\u2610\u23f0\u23f3\u23e9\u23ea]+\s*/u;
function stripEmoji(text) {
    if (typeof text !== 'string') return text;
    return text.replace(EMOJI_RE, '');
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button onClick={handleCopy} className="md-copy-btn" title="Copy code">
            {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
    );
}

const components = {
    // Links: blue, underline on hover, external icon
    a({ href, children }) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
                {children}
                <ExternalLink size={11} className="md-link-icon" />
            </a>
        );
    },

    // Code blocks with copy button
    pre({ children }) {
        const codeEl = children?.props;
        const text = codeEl?.children || '';
        return (
            <div className="md-code-block">
                <CopyButton text={typeof text === 'string' ? text : ''} />
                <pre>{children}</pre>
            </div>
        );
    },

    // Inline code
    code({ inline, className, children, ...props }) {
        if (inline) {
            return <code className="md-inline-code" {...props}>{children}</code>;
        }
        return <code className={className} {...props}>{children}</code>;
    },

    // Strip emoji from headings
    h1({ children }) { return <h1>{typeof children === 'string' ? stripEmoji(children) : children}</h1>; },
    h2({ children }) { return <h2>{typeof children === 'string' ? stripEmoji(children) : children}</h2>; },
    h3({ children }) { return <h3>{typeof children === 'string' ? stripEmoji(children) : children}</h3>; },
    h4({ children }) { return <h4>{typeof children === 'string' ? stripEmoji(children) : children}</h4>; },

    // Tables
    table({ children }) { return <div className="md-table-wrap"><table>{children}</table></div>; },

    // Blockquotes
    blockquote({ children }) { return <blockquote className="md-blockquote">{children}</blockquote>; },

    // Lists: strip emoji from items
    li({ children }) { return <li>{children}</li>; },
};

export default function MarkdownRenderer({ content }) {
    if (!content) return null;

    // Pre-process: strip leading emoji from each line
    const cleaned = content
        .split('\n')
        .map(line => {
            // Strip emoji at start of list items and headings
            if (/^(\s*[-*]\s+|#{1,6}\s+)/.test(line)) {
                return line.replace(/^(\s*[-*]\s+|#{1,6}\s+)[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+\s*/u, '$1');
            }
            return line;
        })
        .join('\n');

    return (
        <div className="md-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={components}
            >
                {cleaned}
            </ReactMarkdown>
        </div>
    );
}

