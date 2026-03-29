import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, ChevronLeft, ChevronRight, Filter, CheckCircle, XCircle, Plane, Download } from 'lucide-react';
import APIService from '../services/api';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' },
  sub: { fontSize: '14px', color: '#9ca3af', margin: 0 },
  card: { background: 'linear-gradient(135deg, #1e2538 0%, #1a2030 100%)', border: '1px solid #2d3748', borderRadius: '16px', padding: '24px' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  select: {
    background: '#111827', border: '1px solid #374151', borderRadius: '8px',
    color: '#9ca3af', padding: '7px 12px', fontSize: '12px', cursor: 'pointer', outline: 'none',
  },
  refreshBtn: { background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', padding: '7px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 12px 12px', textAlign: 'left', borderBottom: '1px solid #1f2937' },
  tr: (i) => ({ background: i % 2 === 0 ? 'transparent' : '#ffffff04', borderBottom: '1px solid #1f293750' }),
  td: { padding: '12px', fontSize: '13px', color: '#e5e7eb', verticalAlign: 'middle' },
  tail: { fontWeight: '700', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px' },
  typeBadge: (type) => {
    const isLanding = type === 'landing';
    return {
      display: 'inline-block', fontSize: '11px', fontWeight: '600',
      padding: '2px 8px', borderRadius: '6px',
      background: isLanding ? '#34d39920' : '#38bdf820',
      color: isLanding ? '#34d399' : '#38bdf8',
      border: `1px solid ${isLanding ? '#34d39930' : '#38bdf830'}`,
    };
  },
  statusBadge: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px',
    background: status === 'sent' ? '#34d39915' : '#ef444415',
    color: status === 'sent' ? '#34d399' : '#f87171',
    border: `1px solid ${status === 'sent' ? '#34d39930' : '#ef444430'}`,
  }),
  integIcon: { fontSize: '13px' },
  message: { fontSize: '12px', color: '#6b7280', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' },
  pageInfo: { fontSize: '13px', color: '#6b7280' },
  pageBtn: (disabled) => ({
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', borderRadius: '8px', border: '1px solid #374151',
    background: 'none', color: disabled ? '#374151' : '#9ca3af',
    fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  empty: { textAlign: 'center', padding: '48px 24px', color: '#4b5563' },
  loading: { textAlign: 'center', padding: '48px 24px', color: '#6b7280', fontSize: '13px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' },
  statCard: (color) => ({ background: '#111827', border: `1px solid ${color}20`, borderRadius: '10px', padding: '14px', textAlign: 'center' }),
  statVal: { fontSize: '22px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' },
  statLabel: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 },
};

function integrationIcon(type) {
  const icons = { discord: '🎮', slack: '💬', teams: '🟦', email: '📧' };
  return icons[type] || '🔔';
}

function alertTypeLabel(type) {
  if (type === 'landing') return 'Landing';
  if (type?.includes('nm')) return type.replace('.0nm', 'nm') + ' alert';
  return type || 'Alert';
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LocalTime({ iso }) {
  const [formatted, setFormatted] = React.useState('—');
  React.useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const utcIso = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
    try {
      setFormatted(new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: tz,
      }).format(new Date(utcIso)));
    } catch {
      setFormatted(iso);
    }
  }, [iso]);
  return React.createElement(React.Fragment, null, formatted);
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ aircraft: '', alert_type: '', integration: '' });
  const [aircraft, setAircraft] = useState([]);

  const loadLogs = useCallback(async (p = page, f = filters, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 25 });
      if (f.aircraft) params.append('aircraft', f.aircraft);
      if (f.alert_type) params.append('alert_type', f.alert_type);
      if (f.integration) params.append('integration', f.integration);
      const data = await APIService.client.get(`/api/notifications/logs?${params}`);
      setLogs(data.data.logs || []);
      setTotal(data.data.total || 0);
      setTotalPages(data.data.pages || 1);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filters]);

  const loadStats = async () => {
    try {
      const data = await APIService.getNotificationStats();
      setStats(data);
    } catch {}
  };

  const loadAircraft = async () => {
    try {
      const data = await APIService.getAircraft();
      setAircraft(data || []);
    } catch {}
  };

  useEffect(() => {
    loadStats();
    loadAircraft();
  }, []);

  useEffect(() => {
    loadLogs(page, filters);
  }, [page, filters]);

  const handleFilter = (key, val) => {
    const newFilters = { ...filters, [key]: val };
    setFilters(newFilters);
    setPage(1);
  };

  const downloadLogs = async () => {
    try {
      // Fetch all logs without pagination for export
      const params = new URLSearchParams({ page: 1, limit: 10000 });
      if (filters.aircraft) params.append('aircraft', filters.aircraft);
      if (filters.alert_type) params.append('alert_type', filters.alert_type);
      if (filters.integration) params.append('integration', filters.integration);
      const data = await APIService.client.get(`/api/notifications/logs?${params}`);
      const allLogs = data.data.logs || [];

      const formatTime = (iso) => new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });

      const header = 'FinalPing Alert History Export\n' +
        `Exported: ${new Date().toLocaleString()}\n` +
        `Total Alerts: ${allLogs.length}\n` +
        '='.repeat(80) + '\n\n';

      const rows = allLogs.map(log =>
        `[${formatTime(log.sent_at)}] ${log.aircraft_tail} — ${log.alert_type} — ${log.integration_type} — ${log.status}\n  ${log.message}`
      ).join('\n\n');

      const blob = new Blob([header + rows], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finalping-alerts-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download logs:', err);
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Alert Logs</h2>
          <p style={s.sub}>Full history of every notification sent · {total} total</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.refreshBtn} onClick={downloadLogs}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4b5563'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
            <Download size={12} /> Export .txt
          </button>
          <button style={s.refreshBtn} onClick={() => loadLogs(page, filters, true)}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4b5563'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={s.statsRow}>
          {[
            { label: 'Today', value: stats.today, color: '#38bdf8' },
            { label: 'This Week', value: stats.this_week, color: '#a78bfa' },
            { label: 'All Time', value: stats.total, color: '#34d399' },
          ].map(({ label, value, color }) => (
            <div key={label} style={s.statCard(color)}>
              <p style={{ ...s.statVal, color }}>{value ?? '—'}</p>
              <p style={s.statLabel}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={s.card}>
        {/* Filters */}
        <div style={s.filterRow}>
          <Filter size={13} color="#4b5563" />
          <select style={s.select} value={filters.aircraft} onChange={e => handleFilter('aircraft', e.target.value)}>
            <option value="">All Aircraft</option>
            {aircraft.map(a => <option key={a.id} value={a.tail_number}>{a.tail_number}</option>)}
          </select>
          <select style={s.select} value={filters.alert_type} onChange={e => handleFilter('alert_type', e.target.value)}>
            <option value="">All Alert Types</option>
            <option value="landing">Landing</option>
            <option value="2nm">2nm</option>
            <option value="5nm">5nm</option>
            <option value="10nm">10nm</option>
            <option value="15nm">15nm</option>
          </select>
          <select style={s.select} value={filters.integration} onChange={e => handleFilter('integration', e.target.value)}>
            <option value="">All Channels</option>
            <option value="discord">Discord</option>
            <option value="slack">Slack</option>
            <option value="teams">Teams</option>
            <option value="email">Email</option>
          </select>
          {(filters.aircraft || filters.alert_type || filters.integration) && (
            <button style={{ ...s.refreshBtn, marginLeft: 0, color: '#f87171', borderColor: '#f8717130' }}
              onClick={() => { setFilters({ aircraft: '', alert_type: '', integration: '' }); setPage(1); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={s.loading}>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={s.empty}>
            <Bell size={28} color="#2d3748" style={{ marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
            <p style={{ margin: '0 0 4px', fontSize: '14px' }}>No alerts found</p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              {filters.aircraft || filters.alert_type || filters.integration
                ? 'Try adjusting your filters'
                : 'Alerts will appear here once the tracker sends notifications'}
            </p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Aircraft</th>
                <th style={s.th}>Alert</th>
                <th style={s.th}>Channel</th>
                <th style={s.th}>Message</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={s.tr(i)}>
                  <td style={s.td}>
                    <div style={s.tail}>
                      <Plane size={12} color="#38bdf8" />
                      {log.aircraft_tail}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={s.typeBadge(log.alert_type)}>
                      {alertTypeLabel(log.alert_type)}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9ca3af' }}>
                      <span style={s.integIcon}>{integrationIcon(log.integration_type)}</span>
                      {log.integration_type}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.message} title={log.message}>{log.message}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.statusBadge(log.status)}>
                      {log.status === 'sent'
                        ? <CheckCircle size={10} />
                        : <XCircle size={10} />
                      }
                      {log.status}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#6b7280', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    <LocalTime iso={log.sent_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={s.pagination}>
            <span style={s.pageInfo}>
              Page {page} of {totalPages} · {total} total
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={s.pageBtn(page === 1)} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={13} /> Prev
              </button>
              <button style={s.pageBtn(page === totalPages)} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
