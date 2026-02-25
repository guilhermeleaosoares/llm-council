import { useState, useRef } from 'react';
import { Paperclip, Send, Image, FileText, X } from 'lucide-react';

export default function MessageInput({ onSend, disabled, placeholder = 'Ask the council anything...' }) {
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (!text.trim() && files.length === 0) return;
        onSend(text, files);
        setText('');
        setFiles([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    };

    const processFiles = (rawFiles) => {
        return Array.from(rawFiles).map(f => ({
            id: Date.now() + Math.random(),
            file: f,
            name: f.name,
            type: f.type,
            preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        }));
    };

    const handleFileSelect = (e) => {
        const newFiles = processFiles(e.target.files);
        setFiles(prev => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeFile = (id) => {
        setFiles(prev => {
            const removed = prev.find(f => f.id === id);
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return prev.filter(f => f.id !== id);
        });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const newFiles = processFiles(e.dataTransfer.files);
        setFiles(prev => [...prev, ...newFiles]);
    };

    return (
        <div className="message-input-container">
            <div
                className={`message-input-wrapper ${files.length > 0 ? 'has-files' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {files.length > 0 && (
                    <div className="file-preview-bar">
                        {files.map(f => (
                            <div key={f.id} className="file-preview-item">
                                {f.preview ? (
                                    <img src={f.preview} alt={f.name} />
                                ) : (
                                    <FileText size={16} />
                                )}
                                <span>{f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name}</span>
                                <button className="file-preview-remove" onClick={() => removeFile(f.id)}>
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="message-input-box">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        rows={1}
                        disabled={disabled}
                    />
                    <div className="input-actions">
                        <button
                            className="input-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach files"
                        >
                            <Paperclip size={18} />
                        </button>
                        <button
                            className="input-btn"
                            onClick={() => imageInputRef.current?.click()}
                            title="Attach image"
                        >
                            <Image size={18} />
                        </button>
                        <button
                            className={`input-btn send`}
                            onClick={handleSend}
                            disabled={disabled || (!text.trim() && files.length === 0)}
                            title="Send to council"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>

                {/* General file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="application/pdf,.pdf,text/*,.txt,.md,.csv,.json,.js,.py,.html,.css,image/*"
                />
                {/* Image-only file input (separate to avoid polluting general input) */}
                <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="image/*"
                />

                {isDragging && (
                    <div className="drop-overlay">
                        Drop files here to attach
                    </div>
                )}
            </div>
        </div>
    );
}

