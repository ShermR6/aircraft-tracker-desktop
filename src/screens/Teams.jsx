import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Map, Calendar, Radio, GitBranch, Plane, Building2,
  Clock, Bell, ScrollText, Plus, X, Trash2, Check, ChevronDown,
  Phone, Hash, Mail, Copy, AlertTriangle, UserCheck, Globe,
  Shield, Edit3, Save, RefreshCw, Loader2,
} from 'lucide-react';
import APIService from '../services/api';
import LiveMap from './LiveMap';

// ── Design tokens (green/amber — ops center feel) ────────────────────────────
const G = '#22d3a3';   // primary green
const A = '#f59e0b';   // amber accent
const BG = '#0a0d12';
const CARD = '#0f1319';
const BORDER = 'rgba(255,255,255,0.08)';

const TABS = [
  { id: 'ops',       label: 'Operations', Icon: Radio },
  { id: 'map',       label: 'Live Map',   Icon: Map },
  { id: 'members',   label: 'Members',    Icon: Users },
  { id: 'schedule',  label: 'Schedule',   Icon: Calendar },
  { id: 'channels',  label: 'Channels',   Icon: Phone },
  { id: 'routing',   label: 'Routing',    Icon: GitBranch },
  { id: 'aircraft',  label: 'Aircraft',   Icon: Plane },
  { id: 'airports',  label: 'Airports',   Icon: Building2 },
  { id: 'arrivals',  label: 'Arrivals',   Icon: Clock },
  { id: 'alerts',    label: 'Alerts',     Icon: Bell },
  { id: 'activity',  label: 'Activity',   Icon: ScrollText },
];

const ROLE_STYLES = {
  owner: { bg: 'rgba(245,158,11,0.15)', color: A, label: 'Owner' },
  admin: { bg: 'rgba(34,211,163,0.12)', color: G, label: 'Admin' },
  member: { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', label: 'Member' },
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHANNEL_TYPES = [
  { key: 'sms', label: 'SMS', Icon: Phone },
  { key: 'discord', label: 'Discord', Icon: Hash },
  { key: 'slack', label: 'Slack', Icon: Hash },
  { key: 'email', label: 'Email', Icon: Mail },
  { key: 'webhook', label: 'Webhook', Icon: Globe },
];

// ── Shared primitives ─────────────────────────────────────────────────────────
const s = {
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 },
  input: {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    borderRadius: 8, color: '#f9fafb', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  },
  label: {
    fontSize: 11, fontWeight: 600, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: 6,
  },
  btn: (variant = 'primary') => ({
    padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
    fontWeight: 600, border: 'none',
    background: variant === 'primary'
      ? `linear-gradient(135deg, ${G}, #16a37a)`
      : variant === 'danger'
      ? 'rgba(239,68,68,0.12)'
      : 'rgba(255,255,255,0.06)',
    color: variant === 'primary' ? '#0a0d12'
      : variant === 'danger' ? '#ef4444'
      : '#d1d5db',
  }),
  greenDot: { width: 8, height: 8, borderRadius: '50%', background: G, display: 'inline-block' },
  amberDot: { width: 8, height: 8, borderRadius: '50%', background: A, display: 'inline-block' },
  grayDot: { width: 8, height: 8, borderRadius: '50%', background: '#4b5563', display: 'inline-block' },
};

function Avatar({ email, size = 34 }) {
  const initials = (email || '??').split('@')[0].slice(0, 2).toUpperCase();
  const hue = [...(email || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},30%,16%)`, border: `1px solid hsl(${hue},30%,26%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.33), fontWeight: 700,
      color: `hsl(${hue},55%,65%)`, flexShrink: 0,
    }}>{initials}</div>
  );
}

function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f1319', border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: 28, width, maxWidth: '92%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, confirmLabel = 'Save', disabled }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
      <button onClick={onCancel} style={{ ...s.btn('ghost'), flex: 1 }}>Cancel</button>
      <button onClick={onConfirm} disabled={disabled} style={{ ...s.btn('primary'), flex: 1, opacity: disabled ? 0.5 : 1 }}>
        {confirmLabel}
      </button>
    </div>
  );
}

function FieldLabel({ children }) { return <label style={s.label}>{children}</label>; }

function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
    <Loader2 size={24} color={G} style={{ animation: 'spin 1s linear infinite' }} />
  </div>;
}

function InlineError({ msg }) {
  if (!msg) return null;
  return <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8 }}>{msg}</div>;
}

function Badge({ color, children }) {
  return <span style={{
    background: color + '22', color, fontSize: 11, fontWeight: 700,
    padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em',
  }}>{children}</span>;
}

// ── Ops Status Bar ────────────────────────────────────────────────────────────
function OpsStatusBar({ onDuty = [], liveAircraft = [], claims = [], arrivals = [] }) {
  const inRange = liveAircraft.filter(a => a.status === 'in_airspace').length;
  const claimCount = claims.length;
  const upcomingArrivals = arrivals.filter(a => a.status === 'pending').length;
  return (
    <div style={{
      display: 'flex', gap: 24, alignItems: 'center',
      padding: '10px 20px',
      background: 'rgba(34,211,163,0.05)',
      borderBottom: `1px solid rgba(34,211,163,0.12)`,
      fontSize: 12, color: '#d1d5db', flexShrink: 0,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={s.greenDot} />
        <strong style={{ color: G }}>{onDuty.filter(m => m.on_duty).length}</strong> on duty
      </span>
      <span style={{ color: '#374151' }}>·</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Plane size={12} color={G} />
        <strong style={{ color: G }}>{inRange}</strong> in range
      </span>
      <span style={{ color: '#374151' }}>·</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <UserCheck size={12} color={claimCount > 0 ? A : '#6b7280'} />
        <strong style={{ color: claimCount > 0 ? A : '#6b7280' }}>{claimCount}</strong> claimed
      </span>
      <span style={{ color: '#374151' }}>·</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={12} color={upcomingArrivals > 0 ? A : '#6b7280'} />
        <strong style={{ color: upcomingArrivals > 0 ? A : '#6b7280' }}>{upcomingArrivals}</strong> expected
      </span>
    </div>
  );
}

// ── Tab: Operations ───────────────────────────────────────────────────────────
function OpsTab({ team, onDuty, liveAircraft, claims, arrivals, activity, onClaim, onRelease, onAck }) {
  const inRange = liveAircraft.filter(a => a.status === 'in_airspace');
  const unacked = activity.filter(a => !a.status?.startsWith('acked'));
  const upcoming = arrivals.filter(a => a.status === 'pending').slice(0, 5);
  const onDutyNow = onDuty.filter(m => m.on_duty);

  function etaCountdown(expected_at) {
    const diff = new Date(expected_at) - new Date();
    if (diff < 0) return 'Overdue';
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* On duty */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          On Duty Now
        </div>
        {onDutyNow.length === 0 ? (
          <div style={{ color: '#4b5563', fontSize: 13 }}>Nobody currently on duty — all channels active</div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {onDutyNow.map(m => (
              <div key={m.member_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar email={m.email} size={36} />
                  <span style={{ ...s.greenDot, position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, border: '2px solid ' + CARD }} />
                </div>
                <span style={{ fontSize: 13, color: '#d1d5db' }}>{m.email.split('@')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Aircraft in range */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Aircraft In Range
        </div>
        {inRange.length === 0 ? (
          <div style={{ color: '#4b5563', fontSize: 13 }}>No aircraft currently in airspace</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inRange.map(a => {
              const claim = claims.find(c => c.icao24 === a.icao24);
              return (
                <div key={a.icao24} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Plane size={16} color={G} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>{a.tail_number}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {a.distance_nm?.toFixed(1)}nm · {a.altitude_ft_agl ? Math.round(a.altitude_ft_agl) + 'ft AGL' : 'On ground'}
                      {claim && <span style={{ color: A, marginLeft: 8 }}>✋ {claim.claimed_by_email?.split('@')[0]}</span>}
                    </div>
                  </div>
                  {claim
                    ? <button onClick={() => onRelease(a.icao24)} style={{ ...s.btn('ghost'), fontSize: 12, padding: '6px 12px' }}>Release</button>
                    : <button onClick={() => onClaim(a.icao24, a.tail_number)} style={{ ...s.btn('primary'), fontSize: 12, padding: '6px 12px' }}>Claim</button>
                  }
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming arrivals */}
      {upcoming.length > 0 && (
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Expected Arrivals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(a => (
              <div key={a.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={15} color={A} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#f9fafb' }}>{a.tail_number}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{a.notes || 'No notes'}</div>
                </div>
                <Badge color={A}>{etaCountdown(a.expected_at)}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unacknowledged alerts */}
      {unacked.length > 0 && (
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Pending Acknowledgement ({unacked.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unacked.slice(0, 5).map(log => (
              <div key={log.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'rgba(239,68,68,0.15)' }}>
                <AlertTriangle size={14} color='#ef4444' />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#f9fafb' }}>{log.aircraft_tail} — {log.alert_type}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{log.message?.slice(0, 60)}</div>
                </div>
                <button onClick={() => onAck(log.id)} style={{ ...s.btn('primary'), fontSize: 12, padding: '6px 12px' }}>Ack</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Tab: Members ──────────────────────────────────────────────────────────────
function MembersTab({ team, myRole, onDuty, onRefresh }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteNote, setInviteNote] = useState('');
  const [inviteTokens, setInviteTokens] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const members = team?.members || [];
  const canManage = myRole === 'owner' || myRole === 'admin';

  const loadTokens = useCallback(async () => {
    try { setInviteTokens(await APIService.listInviteTokens()); } catch { }
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleCreateInvite = async () => {
    try {
      const token = await APIService.createInviteToken(inviteNote || null);
      setInviteTokens(t => [...t, token]);
      setInviteNote('');
      setShowInviteModal(false);
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create invite'); }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try { await APIService.removeMember(memberId); onRefresh(); } catch (e) { setError(e.response?.data?.detail || 'Failed to remove'); }
  };

  const handleDeleteToken = async (id) => {
    try { await APIService.deleteInviteToken(id); setInviteTokens(t => t.filter(x => x.id !== id)); } catch { }
  };

  const copyInviteLink = (token) => {
    const link = `finalpingapp://invite/${token.token}`;
    navigator.clipboard?.writeText(link);
  };

  const dutyMap = Object.fromEntries((onDuty || []).map(m => [m.user_id, m.on_duty]));

  const handleToggleDuty = async (member) => {
    const currently = dutyMap[member.user_id] || false;
    try { await APIService.setMemberDuty(member.id, !currently); onRefresh(); } catch { }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Team Members ({members.length})</span>
        {canManage && <button onClick={() => setShowInviteModal(true)} style={s.btn('primary')}>+ Create Invite Link</button>}
      </div>
      <InlineError msg={error} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {members.map(m => {
          const rs = ROLE_STYLES[m.role] || ROLE_STYLES.member;
          const onDutyNow = dutyMap[m.user_id];
          return (
            <div key={m.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <Avatar email={m.email} />
                <span style={{ ...(onDutyNow ? s.greenDot : s.grayDot), position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, border: '2px solid ' + CARD }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f9fafb' }}>{m.email}</div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                  {m.custom_role_name ? <Badge color={m.custom_role_color || '#9ca3af'}>{m.custom_role_name}</Badge> : <Badge color={rs.color}>{rs.label}</Badge>}
                  {onDutyNow && <span style={{ marginLeft: 8, color: G, fontSize: 11 }}>● On Duty</span>}
                </div>
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleToggleDuty(m)} style={{ ...s.btn('ghost'), fontSize: 12, padding: '5px 10px' }}>
                    {onDutyNow ? 'Set Off Duty' : 'Set On Duty'}
                  </button>
                  {m.role !== 'owner' && myRole === 'owner' && (
                    <button onClick={() => handleRemove(m.id)} style={{ ...s.btn('danger'), fontSize: 12, padding: '5px 10px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invite tokens */}
      {inviteTokens.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Pending Invite Links
          </div>
          {inviteTokens.map(t => (
            <div key={t.id} style={{ ...s.card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{t.token.slice(0, 12)}…</div>
                <div style={{ fontSize: 11, color: '#4b5563' }}>{t.note || 'No note'}</div>
              </div>
              <button onClick={() => copyInviteLink(t)} style={{ ...s.btn('ghost'), fontSize: 12, padding: '5px 10px', display: 'flex', gap: 5 }}>
                <Copy size={13} /> Copy
              </button>
              <button onClick={() => handleDeleteToken(t.id)} style={{ ...s.btn('danger'), padding: '5px 8px' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showInviteModal && (
        <Modal title="Create Invite Link" onClose={() => setShowInviteModal(false)}>
          <FieldLabel>Note (optional)</FieldLabel>
          <input value={inviteNote} onChange={e => setInviteNote(e.target.value)} placeholder="e.g. For John" style={s.input} />
          <ModalActions onCancel={() => setShowInviteModal(false)} onConfirm={handleCreateInvite} confirmLabel="Create Link" />
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Schedule ─────────────────────────────────────────────────────────────
function ScheduleTab({ team, onDuty }) {
  const [shifts, setShifts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [error, setError] = useState('');

  const members = team?.members || [];

  const loadShifts = useCallback(async () => {
    try { setShifts(await APIService.getTeamShifts()); } catch { }
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try { await APIService.deleteTeamShift(id); loadShifts(); } catch (e) { setError(e.response?.data?.detail || 'Failed'); }
  };

  const onDutyNow = (onDuty || []).filter(m => m.on_duty);

  return (
    <div style={{ padding: 20 }}>
      {onDutyNow.length > 0 && (
        <div style={{ ...s.card, padding: '14px 18px', marginBottom: 20, background: 'rgba(34,211,163,0.04)', borderColor: 'rgba(34,211,163,0.15)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>On Duty Right Now</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {onDutyNow.map(m => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar email={m.email} size={30} />
                <span style={{ fontSize: 12, color: '#d1d5db' }}>{m.email.split('@')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Shifts</span>
        <button onClick={() => { setEditShift(null); setShowModal(true); }} style={s.btn('primary')}>+ Add Shift</button>
      </div>
      <InlineError msg={error} />

      {shifts.length === 0 ? (
        <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', paddingTop: 30 }}>No shifts configured yet</div>
      ) : shifts.map(shift => (
        <div key={shift.id} style={{ ...s.card, padding: '14px 18px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: shift.color || G, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb', flex: 1 }}>{shift.name}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{shift.start_time}–{shift.end_time} ({shift.timezone})</span>
            <button onClick={() => { setEditShift(shift); setShowModal(true); }} style={{ ...s.btn('ghost'), padding: '4px 8px' }}><Edit3 size={13} /></button>
            <button onClick={() => handleDelete(shift.id)} style={{ ...s.btn('danger'), padding: '4px 8px' }}><Trash2 size={13} /></button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DAY_NAMES.map((d, i) => (
              <span key={d} style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: shift.days_of_week?.includes(i) ? 'rgba(34,211,163,0.15)' : 'rgba(255,255,255,0.04)',
                color: shift.days_of_week?.includes(i) ? G : '#4b5563',
              }}>{d}</span>
            ))}
          </div>
          {shift.members?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {shift.members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Avatar email={m.email} size={22} />
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{m.email.split('@')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {showModal && <ShiftModal
        shift={editShift}
        members={members}
        onClose={() => setShowModal(false)}
        onSave={loadShifts}
      />}
    </div>
  );
}

function ShiftModal({ shift, members, onClose, onSave }) {
  const [name, setName] = useState(shift?.name || '');
  const [days, setDays] = useState(shift?.days_of_week || [0, 1, 2, 3, 4]);
  const [startTime, setStartTime] = useState(shift?.start_time || '08:00');
  const [endTime, setEndTime] = useState(shift?.end_time || '17:00');
  const [tz, setTz] = useState(shift?.timezone || 'UTC');
  const [color, setColor] = useState(shift?.color || G);
  const [userIds, setUserIds] = useState((shift?.members || []).map(m => m.user_id));
  const [error, setError] = useState('');

  const toggleDay = (i) => setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort());
  const toggleMember = (id) => setUserIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const handleSave = async () => {
    try {
      const data = { name, days_of_week: days, start_time: startTime, end_time: endTime, timezone: tz, color, user_ids: userIds };
      if (shift) {
        await APIService.updateTeamShift(shift.id, data);
        await APIService.setShiftMembers(shift.id, userIds);
      } else {
        await APIService.createTeamShift(data);
      }
      onSave();
      onClose();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save shift'); }
  };

  return (
    <Modal title={shift ? 'Edit Shift' : 'Add Shift'} onClose={onClose} width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FieldLabel>Name</FieldLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Morning shift" style={s.input} />
        </div>
        <div>
          <FieldLabel>Days</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_NAMES.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)} style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: days.includes(i) ? 'rgba(34,211,163,0.2)' : 'rgba(255,255,255,0.06)',
                color: days.includes(i) ? G : '#6b7280',
              }}>{d}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Start</FieldLabel>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...s.input, colorScheme: 'dark' }} />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>End</FieldLabel>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...s.input, colorScheme: 'dark' }} />
          </div>
        </div>
        <div>
          <FieldLabel>Timezone</FieldLabel>
          <input value={tz} onChange={e => setTz(e.target.value)} placeholder="UTC" style={s.input} />
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ ...s.input, width: 60, height: 36, padding: 2, cursor: 'pointer' }} />
        </div>
        <div>
          <FieldLabel>Assigned Members</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map(m => (
              <label key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={userIds.includes(m.user_id)} onChange={() => toggleMember(m.user_id)} />
                <Avatar email={m.email} size={24} />
                <span style={{ fontSize: 13, color: '#d1d5db' }}>{m.email}</span>
              </label>
            ))}
          </div>
        </div>
        <InlineError msg={error} />
        <ModalActions onCancel={onClose} onConfirm={handleSave} confirmLabel={shift ? 'Update' : 'Create'} disabled={!name.trim()} />
      </div>
    </Modal>
  );
}

// ── Tab: Channels ─────────────────────────────────────────────────────────────
function ChannelsTab({ team, onRefresh }) {
  const [showAdd, setShowAdd] = useState(null);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const channels = team?.channels || [];

  const handleAdd = async () => {
    try {
      await APIService.addTeamChannel(showAdd, label.trim(), value.trim());
      setShowAdd(null); setLabel(''); setValue('');
      onRefresh();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to add channel'); }
  };

  const handleRemove = async (id) => {
    try { await APIService.removeTeamChannel(id); onRefresh(); } catch { }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Notification Channels</span>
      </div>
      <InlineError msg={error} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {CHANNEL_TYPES.map(({ key, label: lbl, Icon }) => (
          <button key={key} onClick={() => { setShowAdd(key); setLabel(''); setValue(''); }} style={{ ...s.btn('ghost'), display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon size={14} />{lbl}
          </button>
        ))}
      </div>

      {channels.length === 0 ? (
        <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No channels configured yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {channels.map(ch => (
            <div key={ch.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f9fafb' }}>{ch.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{ch.integration_type} · {ch.value}</div>
              </div>
              <button onClick={() => handleRemove(ch.id)} style={{ ...s.btn('danger'), padding: '5px 8px' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title={`Add ${CHANNEL_TYPES.find(t => t.key === showAdd)?.label} Channel`} onClose={() => setShowAdd(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <FieldLabel>Label</FieldLabel>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Main Discord" style={s.input} />
            </div>
            <div>
              <FieldLabel>Value</FieldLabel>
              <input value={value} onChange={e => setValue(e.target.value)} placeholder={showAdd === 'sms' ? '+1 555 000 0000' : 'https://...'} style={s.input} />
            </div>
            <ModalActions onCancel={() => setShowAdd(null)} onConfirm={handleAdd} disabled={!label.trim() || !value.trim()} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Routing ──────────────────────────────────────────────────────────────
function RoutingTab({ team, onRefresh }) {
  const [routing, setRouting] = useState(team?.routing || {});
  const [escalation, setEscalation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const channels = team?.channels || [];

  useEffect(() => {
    APIService.getEscalationConfig().then(setEscalation).catch(() => {});
  }, []);

  const toggleRoute = (alertType, channelId) => {
    setRouting(r => {
      const disabled = new Set(r[alertType] || []);
      if (disabled.has(channelId)) disabled.delete(channelId);
      else disabled.add(channelId);
      return { ...r, [alertType]: [...disabled] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await APIService.updateTeamRouting(routing);
      if (escalation) await APIService.updateEscalationConfig(escalation);
      onRefresh();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const alertTypes = ['landing', 'takeoff', '10nm', '5nm', '2nm'];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Alert Routing</span>
        <button onClick={handleSave} disabled={saving} style={s.btn('primary')}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
      <InlineError msg={error} />

      {channels.length === 0 ? (
        <div style={{ color: '#4b5563', fontSize: 13 }}>Add channels first to configure routing</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Alert</th>
              {channels.map(ch => (
                <th key={ch.id} style={{ textAlign: 'center', padding: '8px 8px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                  {ch.label.slice(0, 12)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alertTypes.map(at => (
              <tr key={at} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#d1d5db', textTransform: 'capitalize' }}>{at}</td>
                {channels.map(ch => {
                  const disabled = (routing[at] || []).includes(ch.id);
                  return (
                    <td key={ch.id} style={{ textAlign: 'center', padding: '10px 8px' }}>
                      <button onClick={() => toggleRoute(at, ch.id)} style={{
                        width: 22, height: 22, borderRadius: 6, border: `1px solid ${disabled ? BORDER : G}`,
                        background: disabled ? 'transparent' : 'rgba(34,211,163,0.15)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
                      }}>
                        {!disabled && <Check size={13} color={G} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Escalation config */}
      {escalation && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Alert Escalation</div>
          <div style={{ ...s.card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={escalation.enabled} onChange={e => setEscalation(x => ({ ...x, enabled: e.target.checked }))} />
              <span style={{ fontSize: 13, color: '#d1d5db' }}>Enable alert escalation</span>
            </label>
            {escalation.enabled && (
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>Level 1 after (min)</FieldLabel>
                    <input type="number" value={escalation.first_escalation_minutes} min={1}
                      onChange={e => setEscalation(x => ({ ...x, first_escalation_minutes: +e.target.value }))} style={s.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>Level 1 target</FieldLabel>
                    <select value={escalation.first_escalation_target}
                      onChange={e => setEscalation(x => ({ ...x, first_escalation_target: e.target.value }))}
                      style={{ ...s.input, colorScheme: 'dark' }}>
                      <option value="all_admins">All Admins</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>Level 2 after (min)</FieldLabel>
                    <input type="number" value={escalation.second_escalation_minutes} min={1}
                      onChange={e => setEscalation(x => ({ ...x, second_escalation_minutes: +e.target.value }))} style={s.input} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>Level 2 target</FieldLabel>
                    <select value={escalation.second_escalation_target}
                      onChange={e => setEscalation(x => ({ ...x, second_escalation_target: e.target.value }))}
                      style={{ ...s.input, colorScheme: 'dark' }}>
                      <option value="all_admins">All Admins</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Aircraft ─────────────────────────────────────────────────────────────
function AircraftTab({ myRole }) {
  const [aircraft, setAircraft] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tail_number: '', icao24: '', friendly_name: '', aircraft_type: '' });
  const [error, setError] = useState('');
  const canManage = myRole === 'owner' || myRole === 'admin';

  const load = useCallback(async () => {
    try { setAircraft(await APIService.getTeamAircraft()); } catch { }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    try {
      await APIService.addTeamAircraft({ ...form, tail_number: form.tail_number.trim().toUpperCase() });
      setForm({ tail_number: '', icao24: '', friendly_name: '', aircraft_type: '' });
      setShowAdd(false); load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this aircraft?')) return;
    try { await APIService.deleteTeamAircraft(id); load(); } catch { }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Team Aircraft</span>
        {canManage && <button onClick={() => setShowAdd(true)} style={s.btn('primary')}>+ Add Aircraft</button>}
      </div>
      <InlineError msg={error} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {aircraft.map(a => (
          <div key={a.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Plane size={16} color={G} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>{a.tail_number}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{a.icao24 ? `ICAO: ${a.icao24}` : 'No ICAO'}{a.aircraft_type ? ` · ${a.aircraft_type}` : ''}</div>
            </div>
            {canManage && <button onClick={() => handleDelete(a.id)} style={{ ...s.btn('danger'), padding: '5px 8px' }}><Trash2 size={13} /></button>}
          </div>
        ))}
        {aircraft.length === 0 && <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No aircraft tracked yet</div>}
      </div>

      {showAdd && (
        <Modal title="Add Team Aircraft" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['tail_number', 'Tail Number', 'N12345'], ['icao24', 'ICAO24 (optional)', 'a1b2c3'], ['friendly_name', 'Friendly Name', ''], ['aircraft_type', 'Type', 'C172']].map(([key, lbl, ph]) => (
              <div key={key}>
                <FieldLabel>{lbl}</FieldLabel>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={s.input} />
              </div>
            ))}
            <ModalActions onCancel={() => setShowAdd(false)} onConfirm={handleAdd} confirmLabel="Add" disabled={!form.tail_number.trim()} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Airports ─────────────────────────────────────────────────────────────
function AirportsTab({ myRole }) {
  const [airports, setAirports] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ airport_code: '', airport_name: '', latitude: '', longitude: '', elevation_ft_msl: 0 });
  const [error, setError] = useState('');
  const canManage = myRole === 'owner' || myRole === 'admin';

  const load = useCallback(async () => {
    try { setAirports(await APIService.getTeamAirports()); } catch { }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    try { await APIService.addTeamAirport(form); setShowAdd(false); load(); }
    catch (e) { setError(e.response?.data?.detail || 'Failed'); }
  };

  const handleSetActive = async (id) => {
    try { await APIService.setActiveAirport(id); load(); } catch { }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove airport?')) return;
    try { await APIService.deleteTeamAirport(id); load(); } catch { }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Team Airports</span>
        {canManage && <button onClick={() => setShowAdd(true)} style={s.btn('primary')}>+ Add Airport</button>}
      </div>
      <InlineError msg={error} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {airports.map(a => (
          <div key={a.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Building2 size={16} color={a.is_active ? G : '#6b7280'} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>{a.airport_code || 'Unknown'}</span>
                {a.is_active && <Badge color={G}>Active</Badge>}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{a.airport_name} · {a.latitude}, {a.longitude}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!a.is_active && canManage && (
                <button onClick={() => handleSetActive(a.id)} style={{ ...s.btn('primary'), fontSize: 12, padding: '5px 10px' }}>Set Active</button>
              )}
              {canManage && <button onClick={() => handleDelete(a.id)} style={{ ...s.btn('danger'), padding: '5px 8px' }}><Trash2 size={13} /></button>}
            </div>
          </div>
        ))}
        {airports.length === 0 && <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No airports configured</div>}
      </div>

      {showAdd && (
        <Modal title="Add Airport" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['airport_code', 'ICAO Code', 'KDTO'], ['airport_name', 'Name', 'Denton Enterprise'], ['latitude', 'Latitude', '33.2003'], ['longitude', 'Longitude', '-97.1980']].map(([key, lbl, ph]) => (
              <div key={key}>
                <FieldLabel>{lbl}</FieldLabel>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={s.input} />
              </div>
            ))}
            <div>
              <FieldLabel>Elevation (ft MSL)</FieldLabel>
              <input type="number" value={form.elevation_ft_msl} onChange={e => setForm(f => ({ ...f, elevation_ft_msl: +e.target.value }))} style={s.input} />
            </div>
            <ModalActions onCancel={() => setShowAdd(false)} onConfirm={handleAdd} confirmLabel="Add" disabled={!form.latitude || !form.longitude} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Expected Arrivals ────────────────────────────────────────────────────
function ArrivalsTab({ arrivals, onRefresh, myRole }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tail_number: '', expected_at: '', notes: '', reminder_minutes: 30 });
  const [error, setError] = useState('');

  const handleAdd = async () => {
    try {
      await APIService.createExpectedArrival({ ...form, tail_number: form.tail_number.trim().toUpperCase() });
      setShowAdd(false); setForm({ tail_number: '', expected_at: '', notes: '', reminder_minutes: 30 });
      onRefresh();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); }
  };

  const handleCancel = async (id) => {
    try { await APIService.deleteExpectedArrival(id); onRefresh(); } catch { }
  };

  function statusColor(status) {
    if (status === 'arrived') return G;
    if (status === 'late') return '#ef4444';
    if (status === 'cancelled') return '#4b5563';
    return A;
  }

  function etaLabel(expected_at) {
    const diff = new Date(expected_at) - new Date();
    if (diff < -15 * 60000) return 'Late';
    if (diff < 0) return 'Due now';
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb' }}>Expected Arrivals</span>
        <button onClick={() => setShowAdd(true)} style={s.btn('primary')}>+ Add Expected</button>
      </div>
      <InlineError msg={error} />

      {arrivals.length === 0 ? (
        <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', paddingTop: 30 }}>No expected arrivals</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {arrivals.map(a => (
            <div key={a.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock size={15} color={statusColor(a.status)} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>{a.tail_number}</span>
                  <Badge color={statusColor(a.status)}>{a.status === 'pending' ? etaLabel(a.expected_at) : a.status}</Badge>
                  {a.linked_icao24 && <Badge color={G}>Tracking</Badge>}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {new Date(a.expected_at).toLocaleString()}{a.notes ? ` · ${a.notes}` : ''}
                </div>
              </div>
              {a.status === 'pending' && (
                <button onClick={() => handleCancel(a.id)} style={{ ...s.btn('danger'), padding: '5px 8px' }}><X size={13} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Expected Arrival" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <FieldLabel>Tail Number</FieldLabel>
              <input value={form.tail_number} onChange={e => setForm(f => ({ ...f, tail_number: e.target.value }))} placeholder="N12345" style={s.input} />
            </div>
            <div>
              <FieldLabel>Expected Arrival</FieldLabel>
              <input type="datetime-local" value={form.expected_at} onChange={e => setForm(f => ({ ...f, expected_at: e.target.value }))} style={{ ...s.input, colorScheme: 'dark' }} />
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" style={s.input} />
            </div>
            <div>
              <FieldLabel>Reminder (minutes before)</FieldLabel>
              <input type="number" value={form.reminder_minutes} min={0}
                onChange={e => setForm(f => ({ ...f, reminder_minutes: +e.target.value }))} style={s.input} />
            </div>
            <ModalActions onCancel={() => setShowAdd(false)} onConfirm={handleAdd} confirmLabel="Add" disabled={!form.tail_number.trim() || !form.expected_at} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Alerts ───────────────────────────────────────────────────────────────
function AlertsTab() {
  const [settings, setSettings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setSettings(await APIService.getTeamAlertSettings()); } catch { }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (setting) => {
    try {
      await APIService.updateTeamAlertSetting(setting.alert_type, !setting.enabled, setting.message_template);
      load();
    } catch { }
  };

  const handleSaveTemplate = async () => {
    try {
      await APIService.updateTeamAlertSetting(editing.alert_type, editing.enabled, editing.message_template);
      setEditing(null); load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb', marginBottom: 14 }}>Alert Templates</div>
      <InlineError msg={error} />
      {settings.length === 0 && <div style={{ color: '#4b5563', fontSize: 13 }}>No alert settings configured</div>}
      {settings.map(setting => (
        <div key={setting.id} style={{ ...s.card, padding: '14px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f9fafb', textTransform: 'capitalize' }}>{setting.alert_type}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{setting.message_template?.slice(0, 60)}</div>
            </div>
            <button onClick={() => handleToggle(setting)} style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
              background: setting.enabled ? G : '#374151', transition: 'background 0.2s', position: 'relative',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: setting.enabled ? 23 : 3, transition: 'left 0.2s',
              }} />
            </button>
            <button onClick={() => setEditing({ ...setting })} style={{ ...s.btn('ghost'), padding: '5px 8px' }}><Edit3 size={13} /></button>
          </div>
        </div>
      ))}

      {editing && (
        <Modal title={`Edit — ${editing.alert_type}`} onClose={() => setEditing(null)}>
          <FieldLabel>Message Template</FieldLabel>
          <textarea
            value={editing.message_template}
            onChange={e => setEditing(x => ({ ...x, message_template: e.target.value }))}
            style={{ ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace' }}
          />
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 6 }}>
            Variables: {'{tail_number}'} {'{airport}'} {'{altitude}'} {'{speed}'} {'{distance}'}
          </div>
          <ModalActions onCancel={() => setEditing(null)} onConfirm={handleSaveTemplate} />
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Activity ─────────────────────────────────────────────────────────────
function ActivityTab({ activity, onAck, onLoadMore }) {
  const typeColors = { alert: '#ef4444', landing: G, takeoff: A, claim: '#a855f7', escalation: '#ef4444', arrival: G };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#f9fafb', marginBottom: 14 }}>Activity Log</div>
      {activity.length === 0 && <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', paddingTop: 30 }}>No activity yet</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activity.map(log => {
          const acked = log.status?.startsWith('acked');
          const color = typeColors[log.alert_type?.includes('nm') ? 'alert' : log.alert_type] || '#6b7280';
          return (
            <div key={log.id} style={{ ...s.card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: acked ? 0.6 : 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#d1d5db', fontWeight: 500 }}>
                  {log.aircraft_tail} <span style={{ color: '#6b7280' }}>·</span> {log.alert_type}
                </div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.message}
                </div>
                <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
                  {new Date(log.sent_at).toLocaleTimeString()}
                  {acked && <span style={{ color: G, marginLeft: 6 }}>✓ Acked</span>}
                </div>
              </div>
              {!acked && (
                <button onClick={() => onAck(log.id)} style={{ ...s.btn('ghost'), fontSize: 12, padding: '4px 10px', flexShrink: 0 }}>Ack</button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button onClick={onLoadMore} style={{ ...s.btn('ghost'), fontSize: 12 }}>Load More</button>
      </div>
    </div>
  );
}

// ── Main Teams component ──────────────────────────────────────────────────────
export default function Teams({ userData }) {
  const [activeTab, setActiveTab] = useState('ops');
  const [team, setTeam] = useState(null);
  const [onDuty, setOnDuty] = useState([]);
  const [liveAircraft, setLiveAircraft] = useState([]);
  const [claims, setClaims] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activityLimit, setActivityLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const myRole = userData?.team_role || team?.members?.find(m => m.email === userData?.email)?.role || 'member';

  const loadAll = useCallback(async () => {
    try {
      const [t, od, la, cl, ar, act] = await Promise.allSettled([
        APIService.getMyTeam(),
        APIService.getOnDutyMembers(),
        APIService.getTeamLiveAircraft(),
        APIService.getTeamClaims(),
        APIService.getExpectedArrivals(),
        APIService.getTeamActivity(activityLimit),
      ]);
      if (t.status === 'fulfilled') setTeam(t.value);
      if (od.status === 'fulfilled') setOnDuty(od.value);
      if (la.status === 'fulfilled') setLiveAircraft(la.value);
      if (cl.status === 'fulfilled') setClaims(cl.value);
      if (ar.status === 'fulfilled') setArrivals(ar.value);
      if (act.status === 'fulfilled') setActivity(act.value);
      if (t.status === 'rejected') setError(t.reason?.response?.data?.detail || 'Not a team member');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activityLimit]);

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(loadAll, 30000);
    return () => clearInterval(pollRef.current);
  }, [loadAll]);

  const handleClaim = async (icao24, tailNumber) => {
    try { await APIService.claimAircraft(icao24, tailNumber); loadAll(); } catch (e) { alert(e.response?.data?.detail || 'Cannot claim'); }
  };

  const handleRelease = async (icao24) => {
    try { await APIService.releaseClaim(icao24); loadAll(); } catch { }
  };

  const handleAck = async (logId) => {
    try { await APIService.ackActivity(logId); loadAll(); } catch { }
  };

  if (loading) return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );

  if (error) return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <AlertTriangle size={32} color='#ef4444' />
      <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>
      <button onClick={loadAll} style={s.btn('ghost')}>Retry</button>
    </div>
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Team header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${G}, #16a37a)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={16} color='#0a0d12' />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#f9fafb' }}>{team?.name || 'Your Team'}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{myRole} · {team?.members?.length || 0} members</div>
        </div>
        <button onClick={loadAll} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 6 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Ops status bar */}
      <OpsStatusBar onDuty={onDuty} liveAircraft={liveAircraft} claims={claims} arrivals={arrivals} />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: activeTab === id ? `2px solid ${G}` : '2px solid transparent',
              color: activeTab === id ? G : '#6b7280',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'ops' && (
          <OpsTab
            team={team} onDuty={onDuty} liveAircraft={liveAircraft}
            claims={claims} arrivals={arrivals} activity={activity}
            onClaim={handleClaim} onRelease={handleRelease} onAck={handleAck}
          />
        )}
        {activeTab === 'map' && (
          <div style={{ height: '100%' }}>
            <LiveMap isTeam={true} teamData={{ liveAircraft, claims, arrivals }} onClaim={handleClaim} onRelease={handleRelease} />
          </div>
        )}
        {activeTab === 'members' && (
          <MembersTab team={team} myRole={myRole} onDuty={onDuty} onRefresh={loadAll} />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab team={team} onDuty={onDuty} />
        )}
        {activeTab === 'channels' && (
          <ChannelsTab team={team} onRefresh={loadAll} />
        )}
        {activeTab === 'routing' && (
          <RoutingTab team={team} onRefresh={loadAll} />
        )}
        {activeTab === 'aircraft' && (
          <AircraftTab myRole={myRole} />
        )}
        {activeTab === 'airports' && (
          <AirportsTab myRole={myRole} />
        )}
        {activeTab === 'arrivals' && (
          <ArrivalsTab arrivals={arrivals} onRefresh={loadAll} myRole={myRole} />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab />
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            activity={activity}
            onAck={handleAck}
            onLoadMore={() => setActivityLimit(l => l + 50)}
          />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
