import React, { useState, useEffect, useRef } from 'react';
import { Plane, Trash2, Edit2, AlertCircle, Loader, Lock } from 'lucide-react';
import APIService from '../services/api';
import StorageService from '../services/storage';
import { getLimits, getLimitDisplay } from '../config/tierLimits';
import { getColor, setColor, ensureLoaded } from '../services/aircraftColors';
import {
  PageHead, Panel, PanelHead, PanelBody, Count, TableWrap, Table, Th, Td, Tail,
  Button, IconButton, Field, Input, Row2, Notice, Empty,
} from '../ui/kit';

const FALLBACK_DISTANCES = [10, 5, 2];
const DIST_LABELS = { 10: 'Inbound', 5: 'Approach', 2: 'Final' };

function makeEmptyForm(distances) {
  return { icao24: '', tail_number: '', aircraft_type: '', alert_distances: [...distances], color: '' };
}

const s = {
  distBtn: (active) => ({
    flex: 1, padding: '9px', borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-soft)' : 'var(--input)',
    color: active ? 'var(--accent)' : 'var(--faint)',
    font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  distTag: (active) => ({
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, marginRight: 4,
    background: active ? 'var(--accent-soft)' : 'var(--row-hover)',
    color: active ? 'var(--accent)' : 'var(--faint)',
  }),
  swatch: (c) => ({
    width: 11, height: 11, borderRadius: 3, background: c,
    display: 'inline-block', marginRight: 8, verticalAlign: 'middle',
    cursor: 'pointer', flexShrink: 0,
  }),
  confirmOverlay: {
    position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  confirmBox: {
    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
    padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
  },
};

export default function AircraftManager({ isViewOnly = false }) {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalDistances, setGlobalDistances] = useState(FALLBACK_DISTANCES);
  const [form, setForm] = useState(makeEmptyForm(FALLBACK_DISTANCES));
  const [editingId, setEditingId] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);
  const [tier, setTier] = useState('starter');
  const [confirmModal, setConfirmModal] = useState(null);
  const [colorVersion, setColorVersion] = useState(0);
  const lookupTimer = useRef(null);

  useEffect(() => {
    ensureLoaded().then(() => setColorVersion(v => v + 1));
    loadAircraft();
    APIService.getCurrentUser().then(d => { if (d?.license_tier) setTier(d.license_tier); }).catch(() => {
      StorageService.getUserData().then(d => { if (d?.license_tier) setTier(d.license_tier); });
    });
    APIService.getAirportConfig().then(cfg => {
      if (cfg?.alert_distances_nm?.length) {
        const dists = cfg.alert_distances_nm.map(Number).sort((a, b) => b - a);
        setGlobalDistances(dists);
        setForm(makeEmptyForm(dists));
      }
    }).catch(() => {});
  }, []);

  const loadAircraft = async () => {
    try {
      const data = await APIService.getAircraft();
      setAircraft(data || []);
    } catch {
      showMessage('error', 'Failed to load aircraft');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const lookupIcao = async (icao) => {
    if (icao.length !== 6) return;
    setLookingUp(true);
    try {
      const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${icao}`);
      if (res.ok) {
        const json = await res.json();
        const info = json?.response?.aircraft;
        if (info) {
          setForm(p => ({
            ...p,
            tail_number: info.registration || p.tail_number,
            aircraft_type: info.type || info.manufacturer_name || '',
          }));
        }
      }
    } catch { /* silently ignore */ }
    setLookingUp(false);
  };

  const handleIcaoChange = (val) => {
    const v = val.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 6);
    setForm(p => ({ ...p, icao24: v, tail_number: '', aircraft_type: '' }));
    clearTimeout(lookupTimer.current);
    if (v.length === 6) {
      lookupTimer.current = setTimeout(() => lookupIcao(v), 300);
    }
  };

  const toggleDistance = (d) => {
    setForm(p => {
      const has = p.alert_distances.includes(d);
      if (has && p.alert_distances.length === 1) return p;
      return { ...p, alert_distances: has ? p.alert_distances.filter(x => x !== d) : [...p.alert_distances, d].sort((a, b) => b - a) };
    });
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      icao24: a.icao24 || '',
      tail_number: a.tail_number || '',
      aircraft_type: a.aircraft_type || '',
      alert_distances: a.alert_distances || [...globalDistances],
      color: getColor(a.tail_number),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(makeEmptyForm(globalDistances));
  };

  const handleColorChange = async (tail, color) => {
    await setColor(tail, color);
    setColorVersion(v => v + 1);
  };

  const handleSave = async () => {
    if (!form.icao24 || form.icao24.length !== 6) {
      showMessage('error', 'Enter a valid 6-character ICAO24 hex code');
      return;
    }
    if (!form.tail_number.trim()) {
      showMessage('error', 'Tail number is required');
      return;
    }
    setSaving(true);
    try {
      const tail = form.tail_number.toUpperCase();
      if (editingId) {
        await APIService.updateAircraft(
          editingId, tail, form.icao24, null,
          form.aircraft_type || null, form.alert_distances,
        );
        showMessage('success', `${tail} updated`);
        setEditingId(null);
      } else {
        await APIService.addAircraft(
          tail, form.icao24, null,
          form.aircraft_type || null, form.alert_distances,
        );
        showMessage('success', `${tail} added`);
      }
      if (form.color) {
        await setColor(tail, form.color);
        setColorVersion(v => v + 1);
      }
      await loadAircraft();
      setForm(makeEmptyForm(globalDistances));
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to save aircraft');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, tailNum) => {
    try {
      await new Promise((resolve, reject) => setConfirmModal({ message: `Remove ${tailNum} from tracking?`, onConfirm: resolve, onCancel: reject }));
      setConfirmModal(null);
    } catch { setConfirmModal(null); return; }
    setDeleting(id);
    try {
      await APIService.deleteAircraft(id);
      setAircraft(prev => prev.filter(a => a.id !== id));
      if (editingId === id) cancelEdit();
      showMessage('success', `${tailNum} removed`);
    } catch {
      showMessage('error', 'Failed to remove aircraft');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={s.loading}>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading aircraft...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const limits = getLimits(tier);
  const atLimit = aircraft.length >= limits.aircraft;
  const isAdding = !editingId;
  const formColor = form.color || (form.tail_number ? getColor(form.tail_number.toUpperCase()) : '#38bdf8');

  return (
    <>
      {confirmModal && (
        <div style={s.confirmOverlay}>
          <div style={s.confirmBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Trash2 size={17} color="var(--bad)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Remove aircraft</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 22px' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => confirmModal.onCancel()}>Cancel</Button>
              <Button variant="danger" onClick={() => confirmModal.onConfirm()}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      <PageHead
        title="Aircraft"
        subtitle={`My fleet — ${aircraft.length} of ${getLimitDisplay(limits.aircraft)} tail numbers used`}
        right={!isViewOnly && (
          <Button
            icon={<Plane size={14} />}
            disabled={atLimit}
            onClick={() => document.getElementById('track-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >Add aircraft</Button>
        )}
      />

      {atLimit && (
        <Notice
          t="warn"
          icon={<Lock size={15} />}
          right={<Button variant="ghost" onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}>Upgrade</Button>}
        >
          <span style={{ textTransform: 'capitalize' }}>{tier}</span>&nbsp;plan limit reached — upgrade to track more aircraft.
        </Notice>
      )}

      {message && (
        <Notice t={message.type === 'error' ? 'bad' : 'good'} icon={<AlertCircle size={15} />}>
          {message.text}
        </Notice>
      )}

      <Panel>
        <PanelHead title="My fleet" right={<Count>{aircraft.length} tracked</Count>} />
        {aircraft.length === 0 ? (
          <Empty
            icon={<Plane size={22} />}
            title="No aircraft yet"
            hint="Add your first tail number below to start tracking."
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Tail number</Th>
                  <Th>ICAO 24-bit</Th>
                  <Th>Aircraft type</Th>
                  <Th>Map color</Th>
                  <Th>Alert distances</Th>
                  {!isViewOnly && <Th style={{ textAlign: 'right' }} />}
                </tr>
              </thead>
              <tbody>
                {aircraft.map(a => (
                  <tr key={a.id} style={{ background: editingId === a.id ? 'var(--accent-soft)' : 'transparent' }}>
                    <Td><Tail>{a.tail_number}</Tail></Td>
                    <Td mono dim>{(a.icao24 || '—').toUpperCase()}</Td>
                    <Td dim>{a.aircraft_type || '—'}</Td>
                    <Td>
                      <span
                        title="Click to change color"
                        onClick={() => document.getElementById(`cp-${a.id}`)?.click()}
                        style={s.swatch(getColor(a.tail_number))}
                      />
                      <input
                        id={`cp-${a.id}`}
                        type="color"
                        value={getColor(a.tail_number)}
                        onChange={e => handleColorChange(a.tail_number, e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                        {getColor(a.tail_number)}
                      </span>
                    </Td>
                    <Td>
                      {globalDistances.map(d => (
                        <span key={d} style={s.distTag((a.alert_distances || globalDistances).includes(d))}>
                          {d}nm
                        </span>
                      ))}
                    </Td>
                    {!isViewOnly && (
                      <Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <IconButton
                          tone="accent"
                          title={editingId === a.id ? 'Cancel edit' : 'Edit'}
                          onClick={() => editingId === a.id ? cancelEdit() : startEdit(a)}
                        ><Edit2 size={13} /></IconButton>
                        {' '}
                        <IconButton
                          tone="bad"
                          title="Remove"
                          disabled={deleting === a.id}
                          onClick={() => handleDelete(a.id, a.tail_number)}
                        >
                          {deleting === a.id
                            ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={13} />}
                        </IconButton>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      {!isViewOnly && (
        <Panel style={{ marginTop: 14 }}>
          <div id="track-form" />
          <PanelHead title={editingId ? 'Edit tail' : 'Track new tail'} />
          <PanelBody>
            <Row2>
              <Field
                label="Tail number"
                right={<span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
                  {lookingUp ? 'LOOKING UP…' : 'AUTO'}
                </span>}
              >
                <Input
                  mono placeholder="N504GR" maxLength={10}
                  value={form.tail_number}
                  onChange={e => setForm(p => ({ ...p, tail_number: e.target.value.toUpperCase() }))}
                />
              </Field>
              <Field label="ICAO 24-bit hex" hint="Find it on ADSBExchange or Planespotters.">
                <Input
                  mono placeholder="a4992d"
                  value={form.icao24}
                  onChange={e => handleIcaoChange(e.target.value)}
                />
              </Field>
            </Row2>

            <Field label="Aircraft type" hint="Auto-filled from ICAO lookup — edit if it looks wrong.">
              <Input
                placeholder="Auto-filled from ICAO lookup"
                value={form.aircraft_type}
                onChange={e => setForm(p => ({ ...p, aircraft_type: e.target.value }))}
              />
            </Field>

            <Field label="Map color">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  title="Open color wheel"
                  onClick={() => document.getElementById('form-color-pick')?.click()}
                  style={{
                    width: 32, height: 32, borderRadius: 8, background: formColor,
                    cursor: 'pointer', flexShrink: 0, border: '1px solid var(--border)',
                  }}
                />
                <input
                  id="form-color-pick" type="color" value={formColor}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <Input
                  mono maxLength={7} placeholder="#38bdf8" value={formColor}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm(p => ({ ...p, color: v }));
                  }}
                />
              </div>
            </Field>

            <Field label="Alert distances" hint="Inbound · Approach · Final — one alert fires at each ring.">
              <Row2 cols={globalDistances.length} style={{ gap: 10 }}>
                {globalDistances.map(d => (
                  <button
                    key={d}
                    style={s.distBtn(form.alert_distances.includes(d))}
                    onClick={() => toggleDistance(d)}
                  >{d} nm</button>
                ))}
              </Row2>
            </Field>

            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <Button onClick={handleSave} disabled={saving || (atLimit && isAdding)}>
                {saving
                  ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : atLimit && isAdding
                    ? <><Lock size={14} /> Limit reached</>
                    : editingId ? 'Save changes' : 'Track aircraft'}
              </Button>
              {editingId && <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>}
            </div>
          </PanelBody>
        </Panel>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
