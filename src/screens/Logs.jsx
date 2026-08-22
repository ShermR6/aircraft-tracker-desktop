import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, Filter, CheckCircle, XCircle, Plane, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import APIService from '../services/api';
import { getColor, ensureLoaded } from '../services/aircraftColors';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function aircraftCardColor(tail) {
  const hex = getColor(tail);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    border: hex,
    bg: `rgba(${r},${g},${b},0.06)`,
    badge: hex,
    badgeBg: `rgba(${r},${g},${b},0.14)`,
  };
}

function alertTypeLabel(type) {
  if (type === 'landing') return 'Landing';
  if (type?.includes('nm')) return type.replace('.0nm', 'nm') + ' alert';
  return type || 'Alert';
}

function integrationIcon(type) {
  const icons = { discord: '🎮', slack: '💬', teams: '🟦', email: '📧', sms: '📱', whatsapp: '🟢' };
  return icons[type] || '🔔';
}

function formatDateGroup(iso) {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function formatTime(iso) {
  try {
    const utc = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(new Date(utc));
  } catch { return iso; }
}

function CheckboxDropdown({ label, options, selected, onChange, formatLabel }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (val) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  const active = selected.length > 0;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
        background: active ? 'rgba(59,130,246,0.15)' : '#111827',
        border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid #374151',
        color: active ? '#60a5fa' : '#9ca3af',
        cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {label}{active ? ` (${selected.length})` : ''} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#1a2030', border: '1px solid #2d3748', borderRadius: '10px',
          padding: '8px 0', minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', color: selected.includes(opt) ? '#f9fafb' : '#9ca3af' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                style={{ accentColor: '#3b82f6', width: '14px', height: '14px', flexShrink: 0 }} />
              {formatLabel ? formatLabel(opt) : opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedAircraft, setSelectedAircraft] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [pageSize, setPageSize] = useState(20);

  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await APIService.client.get('/api/notifications/logs?page=1&limit=500');
      setLogs(data.data.logs || []);
    } catch (err) { console.error('Failed to load logs:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    ensureLoaded();
    loadLogs();
    APIService.getNotificationStats().then(setStats).catch(() => {});
    APIService.getAircraft().then(d => setAircraft(d || [])).catch(() => {});
  }, []);

  const hasFilters = selectedAircraft.length > 0 || selectedTypes.length > 0 || selectedChannels.length > 0;
  const clearFilters = () => { setSelectedAircraft([]); setSelectedTypes([]); setSelectedChannels([]); setPage(1); };

  const filteredLogs = logs.filter(l =>
    (selectedAircraft.length === 0 || selectedAircraft.includes(l.aircraft_tail)) &&
    (selectedTypes.length === 0 || selectedTypes.includes(l.alert_type)) &&
    (selectedChannels.length === 0 || selectedChannels.includes(l.integration_type))
  );

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filteredLogs.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Group page slice by date
  const groups = [];
  let currentGroup = null;
  for (const log of pageSlice) {
    const label = formatDateGroup(log.sent_at);
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(log);
  }

  const downloadLogs = () => {
    const header = `FinalPing Alert History Export\nExported: ${new Date().toLocaleString()}\nTotal: ${filteredLogs.length}\n${'='.repeat(80)}\n\n`;
    const rows = filteredLogs.map(l =>
      `[${new Date(l.sent_at).toLocaleString()}] ${l.aircraft_tail} — ${l.alert_type} — ${l.integration_type} — ${l.status}\n  ${l.message}`
    ).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([header + rows], { type: 'text/plain' }));
    a.download = `finalping-alerts-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const btnStyle = {
    background: 'none', border: '1px solid #374151', borderRadius: '8px',
    color: '#9ca3af', padding: '7px 12px', fontSize: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' }}>Alert Logs</h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            Full history of every notification sent · {hasFilters ? `${filteredLogs.length} of ${logs.length}` : logs.length} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnStyle} onClick={downloadLogs}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4b5563'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
            <Download size={12} /> Export .txt
          </button>
          <button style={btnStyle} onClick={() => loadLogs(true)}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4b5563'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[{ label: 'Today', value: stats.today, color: '#38bdf8' }, { label: 'This Week', value: stats.this_week, color: '#a78bfa' }, { label: 'All Time', value: stats.total, color: '#34d399' }].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#111827', border: `1px solid ${color}20`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: '700', color, margin: '0 0 2px 0' }}>{value ?? '—'}</p>
              <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} color="#4b5563" />
        <CheckboxDropdown label="Aircraft" options={aircraft.map(a => a.tail_number)} selected={selectedAircraft}
          onChange={v => { setSelectedAircraft(v); setPage(1); }} />
        <CheckboxDropdown label="Alert Types" options={['2nm', '5nm', '10nm', '15nm', 'landing']} selected={selectedTypes}
          onChange={v => { setSelectedTypes(v); setPage(1); }}
          formatLabel={t => t === 'landing' ? '🛬 Landing' : `📍 ${t} out`} />
        <CheckboxDropdown label="Channels" options={['discord', 'slack', 'teams', 'email', 'sms', 'whatsapp']} selected={selectedChannels}
          onChange={v => { setSelectedChannels(v); setPage(1); }}
          formatLabel={c => c.charAt(0).toUpperCase() + c.slice(1)} />
        {hasFilters && (
          <button style={{ ...btnStyle, color: '#f87171', borderColor: '#f8717130' }} onClick={clearFilters}>✕ Clear</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280', fontSize: '13px' }}>Loading logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#4b5563' }}>
          <Bell size={28} color="#2d3748" style={{ marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
          <p style={{ margin: '0 0 4px', fontSize: '14px' }}>No alerts found</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#374151' }}>
            {hasFilters ? 'Try adjusting your filters' : 'Alerts will appear here once the tracker sends notifications'}
          </p>
        </div>
      ) : (
        <>
          {groups.map(group => (
            <div key={group.label} style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '10px', paddingLeft: '2px' }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map(log => {
                  const c = aircraftCardColor(log.aircraft_tail);
                  return (
                    <div key={log.id} style={{
                      background: c.bg,
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `4px solid ${c.border}`,
                      borderRadius: '10px',
                      padding: '12px 16px',
                    }}>
                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13px', color: '#f9fafb' }}>
                          <Plane size={11} color={c.border} />
                          {log.aircraft_tail}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px',
                          background: c.badgeBg, color: c.badge, border: `1px solid ${c.border}30`,
                        }}>
                          {alertTypeLabel(log.alert_type)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#6b7280' }}>
                          <span>{integrationIcon(log.integration_type)}</span>
                          {log.integration_type}
                        </span>
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {log.status === 'sent'
                            ? <CheckCircle size={11} color="#34d399" />
                            : <XCircle size={11} color="#f87171" />}
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{formatTime(log.sent_at)}</span>
                        </span>
                      </div>
                      {/* Message */}
                      <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5, paddingLeft: '2px' }}>
                        {log.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #1f2937', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {filteredLogs.length === 0 ? 'No results' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredLogs.length)} of ${filteredLogs.length}`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#4b5563' }}>Per page:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <button key={n} onClick={() => { setPageSize(n); setPage(1); }} style={{
                      padding: '3px 8px', borderRadius: '6px', border: '1px solid',
                      borderColor: pageSize === n ? 'rgba(14,165,233,0.4)' : '#374151',
                      background: pageSize === n ? 'rgba(14,165,233,0.15)' : 'none',
                      color: pageSize === n ? '#38bdf8' : '#6b7280',
                      fontSize: '12px', fontWeight: pageSize === n ? '700' : '400',
                      cursor: 'pointer',
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button disabled={safePage === 1} onClick={() => setPage(p => p - 1)} style={{
                  ...btnStyle, gap: '4px', opacity: safePage === 1 ? 0.3 : 1, cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                }}>
                  <ChevronLeft size={13} /> Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : safePage <= 4 ? i + 1 : safePage >= totalPages - 3 ? totalPages - 6 + i : safePage - 3 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)} style={{
                      width: '32px', height: '32px', borderRadius: '8px', border: '1px solid',
                      borderColor: p === safePage ? 'rgba(14,165,233,0.4)' : '#374151',
                      background: p === safePage ? 'rgba(14,165,233,0.15)' : 'none',
                      color: p === safePage ? '#38bdf8' : '#6b7280',
                      fontSize: '12px', fontWeight: p === safePage ? '700' : '400',
                      cursor: 'pointer',
                    }}>{p}</button>
                  );
                })}
                <button disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)} style={{
                  ...btnStyle, gap: '4px', opacity: safePage === totalPages ? 0.3 : 1, cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                }}>
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
