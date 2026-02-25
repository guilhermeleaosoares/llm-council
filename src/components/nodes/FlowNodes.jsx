import { Handle, Position } from '@xyflow/react';
import { Bot, FileInput, FileOutput, GitBranch, Merge } from 'lucide-react';
import { MODEL_CATALOG } from '../../data/modelConfig';

export function LLMNode({ data }) {
    const model = MODEL_CATALOG.find(m => m.id === data.modelId) || MODEL_CATALOG[0];
    return (
        <div className="flow-node">
            <Handle type="target" position={Position.Left} />
            <div className="flow-node-header">
                <div className="flow-node-icon" style={{ backgroundColor: model.color }}>
                    <Bot size={14} color="white" />
                </div>
                <div className="flow-node-title">{model.name}</div>
            </div>
            <div className="flow-node-body">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Prompt Template</div>
                <textarea
                    className="prop-textarea"
                    style={{ minHeight: 50, fontSize: 11 }}
                    defaultValue={data.prompt || 'Analyze the input...'}
                    placeholder="Enter prompt template..."
                />
            </div>
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

export function InputNode({ data }) {
    return (
        <div className="flow-node">
            <div className="flow-node-header">
                <div className="flow-node-icon" style={{ backgroundColor: 'var(--accent-success)' }}>
                    <FileInput size={14} color="white" />
                </div>
                <div className="flow-node-title">Input</div>
            </div>
            <div className="flow-node-body">
                <select defaultValue={data.inputType || 'text'}>
                    <option value="text">Text Input</option>
                    <option value="file">File Upload</option>
                    <option value="api">API Webhook</option>
                </select>
            </div>
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

export function OutputNode({ data }) {
    return (
        <div className="flow-node">
            <Handle type="target" position={Position.Left} />
            <div className="flow-node-header">
                <div className="flow-node-icon" style={{ backgroundColor: 'var(--accent-primary)' }}>
                    <FileOutput size={14} color="white" />
                </div>
                <div className="flow-node-title">Output</div>
            </div>
            <div className="flow-node-body">
                <select defaultValue={data.outputType || 'display'}>
                    <option value="display">Display Result</option>
                    <option value="save">Save to File</option>
                    <option value="webhook">Send Webhook</option>
                </select>
            </div>
        </div>
    );
}

export function ConditionNode({ data }) {
    return (
        <div className="flow-node">
            <Handle type="target" position={Position.Left} />
            <div className="flow-node-header">
                <div className="flow-node-icon" style={{ backgroundColor: 'var(--accent-warning)' }}>
                    <GitBranch size={14} color="white" />
                </div>
                <div className="flow-node-title">Condition</div>
            </div>
            <div className="flow-node-body">
                <input
                    type="text"
                    defaultValue={data.condition || 'contains("yes")'}
                    placeholder="Enter condition..."
                />
            </div>
            <Handle type="source" position={Position.Right} id="true" style={{ top: '40%' }} />
            <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} />
        </div>
    );
}

export function MergeNode({ data }) {
    return (
        <div className="flow-node">
            <Handle type="target" position={Position.Left} id="a" style={{ top: '35%' }} />
            <Handle type="target" position={Position.Left} id="b" style={{ top: '65%' }} />
            <div className="flow-node-header">
                <div className="flow-node-icon" style={{ backgroundColor: '#8b5cf6' }}>
                    <Merge size={14} color="white" />
                </div>
                <div className="flow-node-title">Merge</div>
            </div>
            <div className="flow-node-body">
                <select defaultValue={data.strategy || 'concat'}>
                    <option value="concat">Concatenate</option>
                    <option value="vote">Majority Vote</option>
                    <option value="best">Best Response</option>
                </select>
            </div>
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

export const nodeTypes = {
    llm: LLMNode,
    input: InputNode,
    output: OutputNode,
    condition: ConditionNode,
    merge: MergeNode,
};
