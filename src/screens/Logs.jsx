import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import APIService from '../services/api';
import {
  PageHead, Panel, PanelHead, Count, StatStrip, TableWrap, Table, Th, Td, Tail,
  Pill, Button, Empty,
} from '../ui/kit';
import { getColor, ensureLoaded } from '../services/aircraftColors';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function alertTypeLabel(type) {
  if (type === 'landing') return 'Landing';
  if (type?.includes('nm')) return type.replace('.0nm', 'nm') + ' alert';
  return type || 'Alert';
}

function channelLabel(type) {
  const names = {
    discord: 'Discord', slack: 'Slack', teams: 'Microsoft Teams', email: 'Email',
    sms: 'SMS', whatsapp: 'WhatsApp', telegram: 'Telegram', webhook: 'Webhook',
    google_chat: 'Google Chat',
  };
  return names[type] || type;
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
        background: active ? 'var(--accent-soft)' : 'var(--input)',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        color: active ? 'var(--accent)' : 'var(--muted)',
        cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {label}{active ? ` (${selected.length})` : ''} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: '10px',
          padding: '8px 0', minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', color: selected.includes(opt) ? 'var(--text)' : 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px', flexShrink: 0 }} />
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
    background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--muted)', padding: '7px 12px', fontSize: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
  };

  return (
    <>
      <PageHead
        title="Alert Logs"
        subtitle={`Every alert FinalPing has delivered \u00b7 ${hasFilters ? `${filteredLogs.length} of ${logs.length}` : logs.length} total`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" icon={<Download size={13} />} onClick={downloadLogs}>Export .txt</Button>
            <Button
              variant="ghost"
              icon={<RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />}
              onClick={() => loadLogs(true)}
            >Refresh</Button>
          </div>
        }
      />

      {stats && (
        <StatStrip items={[
          { label: 'Today', value: stats.today ?? '\u2014' },
          { label: 'This Week', value: stats.this_week ?? '\u2014' },
          { label: 'All Time', value: stats.total ?? '\u2014' },
        ]} />
      )}

      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} color="var(--faint)" />
        <CheckboxDropdown
          label="Aircraft" options={aircraft.map(a => a.tail_number)} selected={selectedAircraft}
          onChange={v => { setSelectedAircraft(v); setPage(1); }}
        />
        <CheckboxDropdown
          label="Alert Types" options={['2nm', '5nm', '10nm', '15nm', 'landing']} selected={selectedTypes}
          onChange={v => { setSelectedTypes(v); setPage(1); }}
          formatLabel={t => t === 'landing' ? 'Landing' : `${t} out`}
        />
        <CheckboxDropdown
          label="Channels" options={['discord', 'slack', 'teams', 'email', 'sms', 'whatsapp']} selected={selectedChannels}
          onChange={v => { setSelectedChannels(v); setPage(1); }}
          formatLabel={channelLabel}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>
            Clear filters
          </Button>
        )}
      </div>

      <Panel>
        <PanelHead
          title="History"
          right={<Count>{filteredLogs.length} {filteredLogs.length === 1 ? 'alert' : 'alerts'}</Count>}
        />
        {loading ? (
          <Empty title="Loading logs\u2026" />
        ) : filteredLogs.length === 0 ? (
          <Empty
            icon={<Bell size={22} />}
            title="No alerts found"
            hint={hasFilters
              ? 'Try adjusting your filters.'
              : 'Alerts appear here once the tracker sends its first notification.'}
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th>Tail</Th>
                    <Th>Event</Th>
                    <Th>Channel</Th>
                    <Th>Message</Th>
                    <Th>Result</Th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <React.Fragment key={group.label}>
                      <tr>
                        <td colSpan={6} style={{
                          padding: '8px 17px', background: 'var(--panel-2)',
                          borderBottom: '1px solid var(--border-soft)',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
                          textTransform: 'uppercase', color: 'var(--faint)',
                        }}>{group.label}</td>
                      </tr>
                      {group.items.map(log => {
                        const ok = !log.status || ['sent', 'success', 'delivered'].includes(String(log.status).toLowerCase());
                        return (
                          <tr key={log.id}>
                            <Td mono style={{ color: 'var(--faint)', whiteSpace: 'nowrap' }}>
                              {formatTime(log.sent_at)}
                            </Td>
                            <Td>
                              <span style={{
                                width: 8, height: 8, borderRadius: 2, display: 'inline-block',
                                marginRight: 8, verticalAlign: 'middle',
                                background: getColor(log.aircraft_tail),
                              }} />
                              <Tail>{log.aircraft_tail}</Tail>
                            </Td>
                            <Td>
                              <Pill t={log.alert_type === 'landing' ? 'good' : 'accent'}>
                                {alertTypeLabel(log.alert_type)}
                              </Pill>
                            </Td>
                            <Td dim>{channelLabel(log.integration_type)}</Td>
                            <Td dim style={{
                              maxWidth: 320, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }} title={log.message}>{log.message}</Td>
                            <Td>
                              {ok ? <Pill t="good">Delivered</Pill> : <Pill t="warn">{log.status}</Pill>}
                            </Td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 17px', borderTop: '1px solid var(--border-soft)',
              fontSize: 11.5, color: 'var(--faint)', gap: 12, flexWrap: 'wrap',
            }}>
              <span>
                Showing {(safePage - 1) * pageSize + 1}\u2013{Math.min(safePage * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </span>
              {totalPages > 1 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Button
                    variant="ghost" disabled={safePage === 1}
                    onClick={() => setPage(pp => pp - 1)}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    icon={<ChevronLeft size={13} />}
                  >Prev</Button>
                  <span style={{ fontFamily: 'var(--font-mono)', padding: '0 4px' }}>
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost" disabled={safePage === totalPages}
                    onClick={() => setPage(pp => pp + 1)}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >Next <ChevronRight size={13} /></Button>
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)' }}>Per page: {pageSize}</span>
            </div>
          </>
        )}
      </Panel>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
