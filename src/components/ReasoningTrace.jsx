import { useState } from 'react';
import { ChevronDown, Brain, CheckCircle } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

// Map trace round labels to concise pipeline status messages
function traceToSteps(trace) {
    return trace.map(round => {
        const l = round.label.toLowerCase();
        if (l.includes('round 1') || l.includes('initial')) return 'Obtained replies';
        if (l.includes('round 2') || l.includes('review') || l.includes('fact')) return 'Deliberated & fact-checked';
        if (l.includes('round 3') || l.includes('synthesis')) return 'Synthesized final answer';
        if (l.includes('search')) return 'Searched the web';
        if (l.includes('elect') || l.includes('king') || l.includes('consensus')) return 'Elected king';
        return round.label;
    });
}

export default function ReasoningTrace({ trace }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!trace || trace.length === 0) return null;

    const steps = traceToSteps(trace);

    return (
        <div className="reasoning-trace">
            <button className="reasoning-toggle" onClick={() => setIsOpen(!isOpen)}>
                <Brain size={13} />
                <span>Thinking Process ({trace.length} round{trace.length > 1 ? 's' : ''})</span>
                <ChevronDown size={12} className={`reasoning-chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {/* Collapsed: show pipeline status steps */}
            {!isOpen && (
                <div className="reasoning-steps-summary">
                    {steps.map((step, i) => (
                        <div key={i} className="reasoning-step-item">
                            <CheckCircle size={11} className="reasoning-step-check" />
                            <span>{step}</span>
                            {i < steps.length - 1 && <span className="reasoning-step-arrow">→</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Expanded: full reasoning details */}
            {isOpen && (
                <div className="reasoning-rounds">
                    {trace.map((round, i) => (
                        <div key={i} className="reasoning-round">
                            <div className="reasoning-round-header">
                                {round.label}
                            </div>
                            {round.entries.map((entry, j) => (
                                <div key={j} className="reasoning-entry">
                                    <div className="reasoning-entry-model">{entry.modelName}</div>
                                    <div className="reasoning-entry-text">
                                        <MarkdownRenderer content={entry.text} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

