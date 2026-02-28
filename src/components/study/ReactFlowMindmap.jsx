import React, { useCallback, useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    Panel,
    Position,
    Handle,
    MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Maximize2, ChevronDown, ChevronRight } from 'lucide-react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Computes the tree layout
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 150, height: 50 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodePosition = dagreGraph.node(node.id);
        node.targetPosition = direction === 'TB' ? Position.Top : Position.Left;
        node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

        node.position = {
            x: nodePosition.x - 75,
            y: nodePosition.y - 25,
        };
        return node;
    });

    return { nodes, edges };
};

// Custom Node for displaying text nicely with our theme
const CustomMindmapNode = ({ data, selected }) => {
    return (
        <div style={{
            padding: '10px 15px',
            borderRadius: '8px',
            background: selected ? 'var(--accent-glow)' : 'var(--bg-elevated)',
            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 500,
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            minWidth: '100px',
            maxWidth: '200px',
            wordWrap: 'break-word',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            gap: '8px'
        }}>
            <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
            {data.label}
            {data.hasChildren && (
                <button
                    onClick={data.onToggle}
                    style={{
                        background: 'var(--accent)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-inverse)',
                        padding: 0,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                >
                    {data.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
        </div>
    );
};

const nodeTypes = {
    custom: CustomMindmapNode,
};

// Helpers for graph traversal
const getChildrenIds = (nodeId, edges) => {
    return edges.filter(e => e.source === nodeId).map(e => e.target);
};

// Gets all descendants recursively
const getAllDescendantIds = (nodeId, edges) => {
    let descendants = new Set();
    const stack = [nodeId];
    while (stack.length > 0) {
        const curr = stack.pop();
        const children = getChildrenIds(curr, edges);
        children.forEach(c => {
            if (!descendants.has(c)) {
                descendants.add(c);
                stack.push(c);
            }
        });
    }
    return Array.from(descendants);
};

export default function ReactFlowMindmap({ mindmapData }) {
    const [allNodes, setAllNodes] = useState([]);
    const [allEdges, setAllEdges] = useState([]);

    // Track which nodes are expanded (meaning their immediate children are visible)
    const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());

    // The actual visible state given to React Flow
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Initialize data
    useEffect(() => {
        if (!mindmapData) return;

        try {
            let parsed = mindmapData;

            if (typeof mindmapData === 'string') {
                let cleaned = mindmapData.trim();
                if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
                parsed = JSON.parse(cleaned);
            }

            if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
                console.error("Invalid mindmap data format");
                return;
            }

            // Map custom properties, keeping raw nodes in state
            const rawNodes = parsed.nodes.map(n => ({
                id: String(n.id),
                type: 'custom',
                data: { label: n.data?.label || n.id }
            }));

            const rawEdges = parsed.edges.map(e => ({
                ...e,
                id: e.id ? String(e.id) : `e_${e.source}_${e.target}`,
                source: String(e.source),
                target: String(e.target),
                type: 'smoothstep', // Gives nicely routed lines
                animated: true,     // Optional, could make it true for effect
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' },
                style: { stroke: 'var(--accent)', strokeWidth: 2 }
            }));

            setAllNodes(rawNodes);
            setAllEdges(rawEdges);

            // Find root(s) - nodes with no incoming edges
            const targetIds = new Set(rawEdges.map(e => e.target));
            const rootNodes = rawNodes.filter(n => !targetIds.has(n.id));

            // Set only the root node(s) as expanded initially (start minimized)
            const initialExpanded = new Set();
            rootNodes.forEach(rn => initialExpanded.add(rn.id));
            setExpandedNodeIds(initialExpanded);

        } catch (err) {
            console.error("Failed to parse mindmap data", err);
        }
    }, [mindmapData]);

    // Recalculate visible nodes/edges whenever expansion state changes
    useEffect(() => {
        if (allNodes.length === 0) return;

        // Determine visible nodes
        // A node is visible if it is a root, OR if its parent is expanded
        let visibleNodeIds = new Set();

        // Add roots
        const targetIds = new Set(allEdges.map(e => e.target));
        const rootNodes = allNodes.filter(n => !targetIds.has(n.id));
        rootNodes.forEach(rn => visibleNodeIds.add(rn.id));

        // Transverse to add visible children
        expandedNodeIds.forEach(expId => {
            // If the expanded node itself is visible, its children become visible
            if (visibleNodeIds.has(expId)) {
                getChildrenIds(expId, allEdges).forEach(childId => visibleNodeIds.add(childId));
            }
        });

        // Pass 'hasChildren' and 'isExpanded' flags into the node's data so the component can render the toggle button
        const visibleNodes = allNodes
            .filter(n => visibleNodeIds.has(n.id))
            .map(n => ({
                ...n,
                data: {
                    ...n.data,
                    hasChildren: getChildrenIds(n.id, allEdges).length > 0,
                    isExpanded: expandedNodeIds.has(n.id),
                    onToggle: () => handleToggleNode(n.id) // Pass callback down
                }
            }));

        const visibleEdges = allEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

        // Run Dagre layout on the visible subset
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(visibleNodes, visibleEdges, 'TB');

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [allNodes, allEdges, expandedNodeIds]);

    const handleToggleNode = useCallback((nodeId) => {
        setExpandedNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                // Collapse: remove this node from expanded set
                next.delete(nodeId);
                // Also recursively collapse all descendants to clean up state
                const descendants = getAllDescendantIds(nodeId, allEdges);
                descendants.forEach(d => next.delete(d));
            } else {
                // Expand
                next.add(nodeId);
            }
            return next;
        });
    }, [allEdges]);

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const containerStyle = isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'var(--bg-primary)'
    } : {
        width: '100%',
        height: '100%',
        minHeight: '500px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-default)',
        position: 'relative'
    };

    return (
        <div style={containerStyle}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{ style: { stroke: 'var(--border-strong)', strokeWidth: 2 } }}
                // Remove ReactFlow watermark
                proOptions={{ hideAttribution: true }}
            >
                <Background color="var(--border-default)" gap={20} size={1} />

                <Panel position="top-right" style={{ margin: '15px' }}>
                    <button className="btn secondary" onClick={toggleFullscreen} style={{ padding: '8px 12px', gap: '8px' }}>
                        <Maximize2 size={16} />
                        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    </button>
                </Panel>
            </ReactFlow>
        </div>
    );
}
