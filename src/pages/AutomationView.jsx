import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouncil } from '../context/CouncilContext';
import { Settings, Upload, Download, Copy, AlertCircle } from 'lucide-react';
import AutomationCouncilSidebar from '../components/AutomationCouncilSidebar';

export default function AutomationView() {
    const navigate = useNavigate();
    const { toolKeys } = useCouncil();
    const [n8nJson, setN8nJson] = useState('');
    const fileInputRef = useRef(null);

    const hasN8nConfig = toolKeys?.n8nUrl && toolKeys.n8nUrl.trim().length > 0;

    const handleImportJson = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                // Ensure it's valid JSON
                JSON.parse(event.target.result);
                setN8nJson(event.target.result);
            } catch (err) {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };

    const handleExportJson = () => {
        if (!n8nJson) return;
        const blob = new Blob([n8nJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `n8n-workflow-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="automation-view" style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
            {/* Main Builder Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div className="automation-header">
                    <h2>n8n Automation Engine</h2>
                    <div className="automation-toolbar" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Import n8n JSON for Council Context">
                            <Upload size={14} /> Import Context JSON
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleImportJson} />

                        <button className="toolbar-btn" onClick={handleExportJson} disabled={!n8nJson}>
                            <Download size={14} /> Export Context JSON
                        </button>

                        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', marginLeft: 8, marginRight: 8 }} />
                        <button className="toolbar-btn" onClick={() => setN8nJson('')} disabled={!n8nJson}>
                            Clear Context
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, position: 'relative', background: 'var(--bg-card)' }}>
                    {!hasN8nConfig ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>n8n is not configured</h3>
                            <p style={{ marginBottom: 24, maxWidth: 400, textAlign: 'center', fontSize: 13 }}>
                                Connect your n8n instance in Settings to embed the visual builder here. You can still use the Council Sidebar to generate workflows by passing JSON context.
                            </p>
                            <button
                                className="create-project-btn"
                                style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                                onClick={() => navigate('/settings', { state: { tab: 'tools' } })}
                            >
                                <Settings size={16} /> Configure n8n Integration
                            </button>
                        </div>
                    ) : (
                        <iframe
                            src={toolKeys.n8nUrl.endsWith('/') ? toolKeys.n8nUrl : `${toolKeys.n8nUrl}/`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="n8n Builder"
                            allow="clipboard-read; clipboard-write"
                        />
                    )}
                </div>
            </div>

            {/* AI Council Sidebar */}
            <AutomationCouncilSidebar n8nJson={n8nJson} />
        </div>
    );
}
