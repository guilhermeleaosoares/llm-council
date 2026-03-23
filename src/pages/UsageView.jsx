import { useMemo, useState, Component } from 'react';
import { useUsage, PRICING_TABLE, getPricing } from '../context/UsageContext';
import { BarChart2, Zap, DollarSign, Activity, Trash2, ChevronDown, ChevronUp, Search, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(e) { return { error: e }; }
    render() {
        if (this.state.error) {
            return (
                <div className="usage-scroll-outer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-secondary)', padding: 40 }}>
                    <AlertTriangle size={32} style={{ color: '#ef4444' }} />
                    <strong style={{ color: 'var(--text-primary)' }}>Usage panel error</strong>
                    <code style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 500, textAlign: 'center', whiteSpace: 'pre-wrap' }}>
                        {this.state.error?.message}
                    </code>
                    <button className="btn secondary" onClick={() => this.setState({ error: null })}>Retry</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const PROVIDER_COLORS = {
    'OpenAI': '#10a37f',
    'Anthropic': '#d97706',
    'Google': '#4285f4',
    'xAI': '#1a1a1a',
    'DeepSeek': '#6366f1',
    'Groq': '#f97316',
    'OpenRouter': '#8b5cf6',
    'Together AI': '#ec4899',
    'Cohere': '#06b6d4',
    'Kie AI': '#ef4444',
    'Custom': '#6b7280',
};

function fmtNum(n) {
    if (n == null || isNaN(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return Number(n).toFixed(0);
}

function fmtCost(c) {
    if (c === null || c === undefined) return '—';
    if (c < 0.001) return '<$0.001';
    if (c < 1) return '$' + c.toFixed(4);
    return '$' + c.toFixed(2);
}

function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function StatCard({ icon: Icon, label, value, sub, color }) {
    return (
        <div className="usage-stat-card">
            <div className="usage-stat-icon" style={{ background: color + '22', color }}>
                <Icon size={18} />
            </div>
            <div>
                <div className="usage-stat-value">{value}</div>
                <div className="usage-stat-label">{label}</div>
                {sub && <div className="usage-stat-sub">{sub}</div>}
            </div>
        </div>
    );
}

// ── Mini SVG Bar Chart ──
function BarChart({ data, valueKey, labelKey, color = 'var(--accent)' }) {
    if (!data.length) return <div className="usage-empty-chart">No data</div>;
    const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
    return (
        <div className="usage-bar-chart">
            {data.map((d, i) => (
                <div key={i} className="usage-bar-col" title={`${d[labelKey]}: ${fmtNum(d[valueKey])}`}>
                    <div className="usage-bar-fill" style={{ height: `${((Number(d[valueKey]) || 0) / max) * 100}%`, background: color }} />
                    <div className="usage-bar-label">{d[labelKey]}</div>
                </div>
            ))}
        </div>
    );
}

// ── Horizontal progress bar ──
function ProgressBar({ value, max, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="usage-progress-bg">
            <div className="usage-progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

function UsageViewInner() {
    const { usageLog: rawLog, clearUsage } = useUsage();
    const usageLog = Array.isArray(rawLog) ? rawLog : [];
    const [confirmClear, setConfirmClear] = useState(false);
    const [logSearch, setLogSearch] = useState('');
    const [logPage, setLogPage] = useState(0);
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortDir, setSortDir] = useState('desc');
    const PAGE_SIZE = 50;

    // ── Computed stats ──
    const stats = useMemo(() => {
        if (!usageLog.length) return null;

        let totalInput = 0, totalOutput = 0, totalCost = 0, knownCost = 0;
        const byModel = {};
        const byProvider = {};
        const byDay = {};
        const byRequestType = {};

        for (const e of usageLog) {
            totalInput += e.inputTokens || 0;
            totalOutput += e.outputTokens || 0;
            if (e.estimatedCost !== null && e.estimatedCost !== undefined) {
                totalCost += e.estimatedCost;
                knownCost++;
            }

            // By model
            const mk = e.modelId || e.modelName;
            if (!byModel[mk]) byModel[mk] = { name: e.modelName, slug: e.modelSlug, provider: e.provider, baseUrl: e.baseUrl, input: 0, output: 0, cost: 0, calls: 0 };
            byModel[mk].input += e.inputTokens || 0;
            byModel[mk].output += e.outputTokens || 0;
            byModel[mk].cost += e.estimatedCost || 0;
            byModel[mk].calls++;

            // By provider
            const prov = e.provider || 'Custom';
            if (!byProvider[prov]) byProvider[prov] = { input: 0, output: 0, cost: 0, calls: 0 };
            byProvider[prov].input += e.inputTokens || 0;
            byProvider[prov].output += e.outputTokens || 0;
            byProvider[prov].cost += e.estimatedCost || 0;
            byProvider[prov].calls++;

            // By day
            const day = e.timestamp?.slice(0, 10) || 'unknown';
            if (!byDay[day]) byDay[day] = { tokens: 0, cost: 0, calls: 0 };
            byDay[day].tokens += (e.inputTokens || 0) + (e.outputTokens || 0);
            byDay[day].cost += e.estimatedCost || 0;
            byDay[day].calls++;

            // By request type
            const rt = e.requestType || 'chat';
            if (!byRequestType[rt]) byRequestType[rt] = { calls: 0, tokens: 0 };
            byRequestType[rt].calls++;
            byRequestType[rt].tokens += (e.inputTokens || 0) + (e.outputTokens || 0);
        }

        // Last 14 days chart
        const today = new Date();
        const dayChart = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dayChart.push({ label, tokens: byDay[key]?.tokens || 0, cost: byDay[key]?.cost || 0, calls: byDay[key]?.calls || 0 });
        }

        return {
            totalInput, totalOutput, totalTokens: totalInput + totalOutput,
            totalCost, knownCost,
            byModel: Object.values(byModel).sort((a, b) => (b.input + b.output) - (a.input + a.output)),
            byProvider: Object.entries(byProvider).map(([name, v]) => ({ name, ...v })).sort((a, b) => (b.input + b.output) - (a.input + a.output)),
            dayChart,
            byRequestType,
            totalCalls: usageLog.length,
        };
    }, [usageLog]);

    const maxProviderTokens = stats ? Math.max(...stats.byProvider.map(p => p.input + p.output), 1) : 1;

    // ── Filtered + paginated log ──
    const filteredLog = useMemo(() => {
        let log = [...usageLog];
        if (logSearch.trim()) {
            const q = logSearch.toLowerCase();
            log = log.filter(e =>
                (e.modelName || '').toLowerCase().includes(q) ||
                (e.provider || '').toLowerCase().includes(q) ||
                (e.requestType || '').toLowerCase().includes(q)
            );
        }
        log.sort((a, b) => {
            let av = a[sortBy], bv = b[sortBy];
            if (sortBy === 'tokens') { av = (a.inputTokens || 0) + (a.outputTokens || 0); bv = (b.inputTokens || 0) + (b.outputTokens || 0); }
            if (sortBy === 'cost') { av = a.estimatedCost ?? -1; bv = b.estimatedCost ?? -1; }
            if (typeof av === 'string' || typeof bv === 'string') {
                return sortDir === 'asc'
                    ? String(av ?? '').localeCompare(String(bv ?? ''))
                    : String(bv ?? '').localeCompare(String(av ?? ''));
            }
            return sortDir === 'asc' ? (av ?? 0) - (bv ?? 0) : (bv ?? 0) - (av ?? 0);
        });
        return log;
    }, [usageLog, logSearch, sortBy, sortDir]);

    const paginatedLog = filteredLog.slice(logPage * PAGE_SIZE, (logPage + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filteredLog.length / PAGE_SIZE);

    function toggleSort(col) {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    }

    function SortIcon({ col }) {
        if (sortBy !== col) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
        return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
    }

    if (!usageLog.length) {
        return (
            <div className="usage-scroll-outer">
            <div className="usage-view">
                <div className="usage-header">
                    <h1>Usage & Cost</h1>
                    <p className="usage-header-sub">Track your Council's token consumption and estimated API costs across all providers.</p>
                </div>
                <div className="usage-empty">
                    <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3>No usage data yet</h3>
                    <p>Start a conversation to begin tracking token usage and costs.</p>
                </div>
            </div>
            </div>
        );
    }

    return (
        <div className="usage-scroll-outer">
        <div className="usage-view">
            <div className="usage-header">
                <div>
                    <h1>Usage & Cost</h1>
                    <p className="usage-header-sub">Token consumption and estimated API costs across all providers.</p>
                </div>
                <button className="usage-clear-btn" onClick={() => setConfirmClear(true)}>
                    <Trash2 size={14} /> Clear All
                </button>
            </div>

            {/* ── Stat cards ── */}
            <div className="usage-stats-row">
                <StatCard icon={Activity} label="Total Requests" value={fmtNum(stats.totalCalls)} color="#6366f1" />
                <StatCard
                    icon={Zap}
                    label="Total Tokens"
                    value={fmtNum(stats.totalTokens)}
                    sub={stats.totalTokens > 0 ? `↑ ${fmtNum(stats.totalInput)} in · ${fmtNum(stats.totalOutput)} out` : 'Provider not returning token counts'}
                    color="#f59e0b"
                />
                <StatCard icon={DollarSign} label="Estimated Cost"
                    value={fmtCost(stats.totalCost)}
                    sub={stats.knownCost < stats.totalCalls ? `${stats.knownCost} of ${stats.totalCalls} calls priced` : 'all calls priced'}
                    color="#22c55e" />
                <StatCard icon={BarChart2} label="Active Models" value={stats.byModel.length}
                    sub={`${stats.byProvider.length} provider${stats.byProvider.length !== 1 ? 's' : ''}`} color="#3b82f6" />
            </div>

            {/* ── Daily chart ── */}
            <div className="usage-card">
                <div className="usage-card-title">
                    {stats.totalTokens > 0 ? 'Daily Token Usage (last 14 days)' : 'Daily Requests (last 14 days)'}
                </div>
                <BarChart
                    data={stats.dayChart}
                    valueKey={stats.totalTokens > 0 ? 'tokens' : 'calls'}
                    labelKey="label"
                    color="var(--accent)"
                />
            </div>

            {/* ── Provider + Model grid ── */}
            <div className="usage-grid-2">
                {/* Provider breakdown */}
                <div className="usage-card">
                    <div className="usage-card-title">By Provider</div>
                    <div className="usage-provider-list">
                        {stats.byProvider.map(p => (
                            <div key={p.name} className="usage-provider-row">
                                <div className="usage-provider-name">
                                    <span className="usage-dot" style={{ background: PROVIDER_COLORS[p.name] || '#6b7280' }} />
                                    {p.name}
                                </div>
                                <div className="usage-provider-bar">
                                    <ProgressBar value={stats.totalTokens > 0 ? p.input + p.output : p.calls} max={stats.totalTokens > 0 ? maxProviderTokens : Math.max(...stats.byProvider.map(mp => mp.calls), 1)} color={PROVIDER_COLORS[p.name] || '#6b7280'} />
                                </div>
                                <div className="usage-provider-meta">
                                    <span>{stats.totalTokens > 0 ? fmtNum(p.input + p.output) : fmtNum(p.calls) + ' calls'}</span>
                                    <span className="usage-cost-tag">{fmtCost(p.cost)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Request type breakdown */}
                <div className="usage-card">
                    <div className="usage-card-title">By Request Type</div>
                    <BarChart
                        data={Object.entries(stats.byRequestType).map(([type, v]) => ({ label: type, tokens: v.tokens, calls: v.calls }))}
                        valueKey={stats.totalTokens > 0 ? "tokens" : "calls"}
                        labelKey="label"
                        color="#8b5cf6"
                    />
                </div>
            </div>

            {/* ── Model breakdown table ── */}
            <div className="usage-card">
                <div className="usage-card-title">By Model</div>
                <div className="usage-table-wrap">
                    <table className="usage-table">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Provider</th>
                                <th>Calls</th>
                                <th>Input Tokens</th>
                                <th>Output Tokens</th>
                                <th>Total Tokens</th>
                                <th>Est. Cost</th>
                                <th>Pricing (per 1M)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.byModel.map((m, i) => {
                                const pricing = getPricing(m.slug || '', m.name || '');
                                return (
                                    <tr key={i}>
                                        <td><span className="usage-model-name">{m.name}</span></td>
                                        <td>
                                            <span className="usage-provider-badge" style={{ background: (PROVIDER_COLORS[m.provider] || '#6b7280') + '22', color: PROVIDER_COLORS[m.provider] || '#6b7280' }}>
                                                {m.provider}
                                            </span>
                                        </td>
                                        <td>{m.calls}</td>
                                        <td>{fmtNum(m.input)}</td>
                                        <td>{fmtNum(m.output)}</td>
                                        <td><strong>{fmtNum(m.input + m.output)}</strong></td>
                                        <td className="usage-cost-cell">{fmtCost(m.cost)}</td>
                                        <td className="usage-pricing-cell">
                                            {pricing ? (
                                                <span>${pricing.in} / ${pricing.out}</span>
                                            ) : <span className="usage-unknown">unknown</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Pricing reference ── */}
            <div className="usage-card">
                <div className="usage-card-title">API Pricing Reference (USD per 1M tokens: input / output)</div>
                <div className="usage-pricing-grid">
                    {Object.entries(
                        PRICING_TABLE.reduce((acc, p) => {
                            if (!acc[p.provider]) acc[p.provider] = [];
                            acc[p.provider].push(p);
                            return acc;
                        }, {})
                    ).map(([provider, models]) => (
                        <div key={provider} className="usage-pricing-group">
                            <div className="usage-pricing-group-title" style={{ color: PROVIDER_COLORS[provider] || '#6b7280' }}>
                                {provider}
                            </div>
                            {models.map((m, i) => (
                                <div key={i} className="usage-pricing-row">
                                    <span>{m.label}</span>
                                    <span className="usage-pricing-nums">
                                        {m.in === 0 ? 'varies' : `$${m.in} / $${m.out}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Event log ── */}
            <div className="usage-card">
                <div className="usage-log-header">
                    <div className="usage-card-title">Event Log ({filteredLog.length} events)</div>
                    <div className="usage-log-search">
                        <Search size={13} />
                        <input
                            placeholder="Filter by model, provider…"
                            value={logSearch}
                            onChange={e => { setLogSearch(e.target.value); setLogPage(0); }}
                        />
                    </div>
                </div>
                <div className="usage-table-wrap">
                    <table className="usage-table usage-log-table">
                        <thead>
                            <tr>
                                <th onClick={() => toggleSort('timestamp')} className="sortable">Time <SortIcon col="timestamp" /></th>
                                <th onClick={() => toggleSort('modelName')} className="sortable">Model <SortIcon col="modelName" /></th>
                                <th onClick={() => toggleSort('provider')} className="sortable">Provider <SortIcon col="provider" /></th>
                                <th onClick={() => toggleSort('requestType')} className="sortable">Type <SortIcon col="requestType" /></th>
                                <th onClick={() => toggleSort('tokens')} className="sortable">Tokens <SortIcon col="tokens" /></th>
                                <th onClick={() => toggleSort('cost')} className="sortable">Cost <SortIcon col="cost" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLog.map((e, i) => (
                                <tr key={e.id || i}>
                                    <td className="usage-log-time">{fmtDate(e.timestamp)}</td>
                                    <td>{e.modelName}</td>
                                    <td>
                                        <span className="usage-provider-badge" style={{ background: (PROVIDER_COLORS[e.provider] || '#6b7280') + '22', color: PROVIDER_COLORS[e.provider] || '#6b7280' }}>
                                            {e.provider}
                                        </span>
                                    </td>
                                    <td><span className="usage-type-tag">{e.requestType || 'chat'}</span></td>
                                    <td>{fmtNum((e.inputTokens || 0) + (e.outputTokens || 0))}</td>
                                    <td className="usage-cost-cell">{fmtCost(e.estimatedCost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="usage-pagination">
                        <button disabled={logPage === 0} onClick={() => setLogPage(p => p - 1)}>← Prev</button>
                        <span>Page {logPage + 1} of {totalPages}</span>
                        <button disabled={logPage >= totalPages - 1} onClick={() => setLogPage(p => p + 1)}>Next →</button>
                    </div>
                )}
            </div>

            {/* ── Clear confirm modal ── */}
            {confirmClear && (
                <div className="modal-overlay" onClick={() => setConfirmClear(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
                        <h3 style={{ marginBottom: 10, color: 'var(--text-primary)' }}>Clear Usage Data?</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            This will permanently delete all {usageLog.length} usage events and reset your cost estimates.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
                            <button className="btn" onClick={() => { clearUsage(); setConfirmClear(false); }} style={{ background: '#ef4444', color: '#fff', border: 'none' }}>Clear</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}

export default function UsageView() {
    return (
        <ErrorBoundary>
            <UsageViewInner />
        </ErrorBoundary>
    );
}
