import { useState } from 'react';
import { ChevronDown, CheckCircle, AlertTriangle, XCircle, Crown, Zap } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const VOTE_ICON = {
    agree: <CheckCircle size={12} />,
    partial: <AlertTriangle size={12} />,
    disagree: <XCircle size={12} />,
};
const VOTE_LABEL = {
    agree: 'Agrees with consensus',
    partial: 'Partially agrees',
    disagree: 'Disagrees with consensus',
};

export default function CouncilPanel({ responses, moderationText, consensusLog }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showConsensus, setShowConsensus] = useState(false);

    return (
        <div className="council-panel">
            <button className={`council-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}>
                <span>Council Reasoning — {responses.filter(r => !r.error).length} models weighed in</span>
                <ChevronDown size={16} />
            </button>

            {isOpen && (
                <div className="council-responses">
                    <div className="moderation-summary">
                        <MarkdownRenderer content={moderationText} />
                    </div>

                    {/* Consensus debug panel */}
                    {consensusLog && (
                        <div style={{ marginBottom: 12 }}>
                            <button
                                onClick={() => setShowConsensus(!showConsensus)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'none', border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                                    color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                <Zap size={10} /> Consensus Details ({consensusLog.latencyMs}ms, ~{consensusLog.estimatedTokens} tokens)
                                <ChevronDown size={10} />
                            </button>
                            {showConsensus && (
                                <div style={{
                                    marginTop: 6, padding: 10, borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(0,0,0,0.3)', fontSize: 10, fontFamily: 'var(--font-mono)',
                                    color: 'var(--text-secondary)',
                                }}>
                                    <div style={{ marginBottom: 6, color: 'var(--text-accent)' }}>
                                        Domain: {consensusLog.consensusDomain} · Elected King: {consensusLog.electedKingId}
                                    </div>
                                    {consensusLog.votes?.map((v, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'center' }}>
                                            <span style={{ width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {v.modelId === consensusLog.electedKingId && <Crown size={8} style={{ marginRight: 2 }} />}
                                                {v.modelId.slice(0, 12)}
                                            </span>
                                            <span style={{ color: v.confidence >= 7 ? '#4ade80' : v.confidence >= 4 ? 'var(--text-accent)' : '#ef4444' }}>
                                                {v.confidence}/10
                                            </span>
                                            <span>{v.domain}</span>
                                            <span style={{ color: 'var(--text-muted)', flex: 1 }}>{v.reason}</span>
                                            {v.error && <span style={{ color: '#ef4444' }}>{v.error}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {responses.map((r, i) => (
                        <div key={r.modelId || i} className="llm-response-card"
                            style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="llm-card-header">
                                <div className="llm-card-model">
                                    <div className="llm-card-dot" style={{ backgroundColor: r.error ? '#ef4444' : '#4ade80' }} />
                                    <span className="llm-card-name">
                                        {r.isKing && <Crown size={11} style={{ marginRight: 4, color: 'var(--text-accent)' }} />}
                                        {r.modelName || r.modelId}
                                    </span>
                                    {r.isKing && <span className="llm-card-tier" style={{ color: 'var(--text-accent)', borderColor: 'var(--border-accent)' }}>King</span>}
                                </div>
                                <div className="llm-card-confidence">
                                    <div className="confidence-bar">
                                        <div className="confidence-fill" style={{ width: `${r.confidence * 100}%`, backgroundColor: r.error ? '#ef4444' : 'var(--accent)' }} />
                                    </div>
                                    <span>{Math.round(r.confidence * 100)}%</span>
                                </div>
                            </div>
                            <div className="llm-card-text">
                                <MarkdownRenderer content={r.text} />
                            </div>
                            <div className={`llm-card-vote vote-${r.vote}`}>
                                {VOTE_ICON[r.vote]}
                                <span>{VOTE_LABEL[r.vote]}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
