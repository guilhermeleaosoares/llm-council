import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'var(--font-sans)',
});

export default function MindmapViewer({ content }) {
    const [svgCode, setSvgCode] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const renderMindmap = async () => {
            if (!content) return;
            try {
                setError(null);
                // Clean the text from markdown blocks if the LLM wrapped it
                const cleanCode = content.replace(/```mermaid\n?/gi, '').replace(/```\n?/gi, '').trim();
                if (!cleanCode) return;

                const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, cleanCode);

                if (isMounted) setSvgCode(svg);
            } catch (err) {
                console.error("Mermaid Render Error:", err);
                if (isMounted) setError("Failed to render mindmap. The generated format might be invalid.");
            }
        };

        renderMindmap();

        return () => { isMounted = false; };
    }, [content]);

    if (error) {
        return (
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px', border: '1px solid var(--danger)' }}>
                <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '10px' }}>{error}</p>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
                    {content}
                </div>
            </div>
        );
    }

    if (!svgCode) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--accent)', marginBottom: '15px' }} />
                <div style={{ color: 'var(--text-muted)' }}>Rendering Interactive Mindmap...</div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '600px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={4}
                wheel={{ step: 0.1 }}
                centerOnInit={true}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <React.Fragment>
                        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
                            <button onClick={() => zoomIn()} className="btn secondary" style={{ padding: '6px 10px', background: 'var(--bg-elevated)' }} title="Zoom In">
                                <ZoomIn size={16} />
                            </button>
                            <button onClick={() => zoomOut()} className="btn secondary" style={{ padding: '6px 10px', background: 'var(--bg-elevated)' }} title="Zoom Out">
                                <ZoomOut size={16} />
                            </button>
                            <button onClick={() => resetTransform()} className="btn secondary" style={{ padding: '6px 10px', background: 'var(--bg-elevated)' }} title="Reset View">
                                <Maximize size={16} />
                            </button>
                        </div>
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%', cursor: 'grab' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div
                                dangerouslySetInnerHTML={{ __html: svgCode }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                        </TransformComponent>
                    </React.Fragment>
                )}
            </TransformWrapper>
        </div>
    );
}
