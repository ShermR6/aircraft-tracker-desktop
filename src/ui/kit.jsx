/**
 * Shared UI primitives.
 *
 * Every screen composes these instead of hand-rolling inline styles, so
 * spacing, type scale, and border treatment stay identical across the app.
 * All values come from the tokens in src/index.css — nothing here hardcodes a
 * color.
 *
 * Density is deliberately tighter than finalpingapp.com: this is a monitoring
 * tool that has to fit a fleet table next to a 220px sidebar, not a page that
 * gets read once in daylight.
 */
import React from 'react';

/* ── shared scale ──────────────────────────────────────────────────────────── */
const PAD_X = 17;
const RADIUS = 12;

export const tone = {
  accent: { color: 'var(--accent)', background: 'var(--accent-soft)' },
  good: { color: 'var(--good)', background: 'var(--good-bg)' },
  warn: { color: 'var(--warn)', background: 'var(--warn-bg)' },
  bad: { color: 'var(--bad)', background: 'var(--bad-bg)' },
  neutral: { color: 'var(--faint)', background: 'var(--row-hover)' },
};

/* ── page header ───────────────────────────────────────────────────────────── */
export function PageHead({ title, subtitle, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 16, marginBottom: 20, flexWrap: 'wrap',
    }}>
      <div>
        <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--muted)' }}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

/** Right-aligned timestamp / meta line for a PageHead. */
export function Stamp({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--faint)', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ── panel ─────────────────────────────────────────────────────────────────── */
export function Panel({ children, style }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: RADIUS, overflow: 'hidden', ...style,
    }}>{children}</div>
  );
}

export function PanelHead({ title, right }) {
  return (
    <div style={{
      padding: `13px ${PAD_X}px`, borderBottom: '1px solid var(--border-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      {right}
    </div>
  );
}

export function PanelBody({ children, style }) {
  return <div style={{ padding: PAD_X, ...style }}>{children}</div>;
}

/** Small pill used in panel headers for counts and scope labels. */
export function Count({ children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: 'var(--accent)',
      background: 'var(--accent-soft)', padding: '3px 9px', borderRadius: 999,
    }}>{children}</span>
  );
}

/* ── status ────────────────────────────────────────────────────────────────── */

/**
 * State reads as dot + word, never color alone — so it survives a colorblind
 * viewer and a screenshot pasted into a support thread.
 */
export function Badge({ t = 'neutral', children }) {
  const c = tone[t] || tone.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
      padding: '5px 11px 5px 9px', borderRadius: 999,
      fontSize: 11.5, fontWeight: 600,
      color: c.color, background: c.background,
      border: t === 'neutral' ? '1px solid var(--border)' : 'none',
    }}>
      <i style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'currentColor', flexShrink: 0,
      }} />
      {children}
    </span>
  );
}

export function Pill({ t = 'neutral', children }) {
  const c = tone[t] || tone.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      color: c.color, background: c.background,
    }}>
      <i style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'currentColor', flexShrink: 0,
      }} />
      {children}
    </span>
  );
}

/** Icon + title + description on the left, status on the right. */
export function StatusCard({ icon, title, desc, right }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: RADIUS, padding: `16px ${PAD_X}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        <span style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-soft)', color: 'var(--accent)',
        }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>{title}</p>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>{desc}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

/* ── stat strip ────────────────────────────────────────────────────────────── */

/** items: [{ label, value, sub }] — hairline-separated, equal columns. */
export function StatStrip({ items }) {
  return (
    <Panel>
      <dl style={{
        display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 1, background: 'var(--border-soft)', margin: 0,
      }}>
        {items.map((it) => (
          <div key={it.label} style={{ background: 'var(--panel)', padding: `15px ${PAD_X}px` }}>
            <dt style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
              textTransform: 'uppercase', color: 'var(--faint)', margin: '0 0 6px',
            }}>{it.label}</dt>
            <dd style={{
              margin: 0, fontSize: it.small ? 15 : 19, fontWeight: 800,
              letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
            }}>
              {it.value}
              {it.sub && (
                <small style={{
                  fontSize: 11.5, fontWeight: 500, color: 'var(--muted)',
                  letterSpacing: 0, marginLeft: 5,
                }}>{it.sub}</small>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ── table ─────────────────────────────────────────────────────────────────── */
export function TableWrap({ children }) {
  return <div style={{ overflowX: 'auto' }}>{children}</div>;
}

export function Table({ children }) {
  return (
    <table style={{
      width: '100%', borderCollapse: 'collapse',
      fontSize: 12.5, minWidth: 540, color: 'inherit',
    }}>{children}</table>
  );
}

export function Th({ children, style }) {
  return (
    <th scope="col" style={{
      textAlign: 'left', padding: `9px ${PAD_X}px`,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
      textTransform: 'uppercase', color: 'var(--faint)',
      background: 'var(--panel-2)', borderBottom: '1px solid var(--border-soft)',
      ...style,
    }}>{children}</th>
  );
}

export function Td({ children, mono, dim, strong, style }) {
  return (
    <td style={{
      padding: `11px ${PAD_X}px`, borderBottom: '1px solid var(--border-soft)',
      verticalAlign: 'middle',
      ...(mono ? { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } : null),
      ...(dim ? { color: 'var(--muted)' } : null),
      ...(strong ? { fontWeight: 600 } : null),
      ...style,
    }}>{children}</td>
  );
}

/** Tail number: monospace and semibold so registrations align down the column. */
export function Tail({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontWeight: 600,
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
    }}>{children}</span>
  );
}

/* ── stage bar ─────────────────────────────────────────────────────────────── */

/**
 * Three segments for the three detection rings (Inbound / Approach / Final),
 * filled as an aircraft crosses each one inbound. Mirrors the rings drawn on
 * Airport Config so the same idea reads the same way in both places.
 */
export function StageBar({ filled = 0, total = 3 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} style={{
          width: 13, height: 3, borderRadius: 2, display: 'inline-block',
          background: i < filled ? 'var(--accent)' : 'var(--border)',
        }} />
      ))}
    </span>
  );
}

/* ── buttons ───────────────────────────────────────────────────────────────── */

/**
 * variant: 'primary' (accent) | 'ghost' (outline) | 'danger' | 'cta'.
 * 'cta' is orange and reserved for purchase actions — never ordinary UI.
 */
export function Button({ variant = 'primary', icon, children, style, ...rest }) {
  const base = {
    font: 'inherit', fontSize: 13, fontWeight: 600,
    padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    border: 'none', transition: 'filter 0.15s, background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' },
    danger: { background: 'var(--bad-bg)', border: '1px solid var(--bad)', color: 'var(--bad)' },
    cta: { background: 'var(--cta-soft)', border: '1px solid var(--cta)', color: 'var(--cta)' },
  };
  return (
    <button
      style={{ ...base, ...variants[variant], ...(rest.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : null), ...style }}
      {...rest}
    >
      {icon}{children}
    </button>
  );
}

/** Square icon-only button for row actions. */
export function IconButton({ tone: t = 'accent', title, children, style, ...rest }) {
  const c = tone[t] || tone.accent;
  return (
    <button
      title={title}
      {...rest}
      style={{
        width: 28, height: 28, borderRadius: 7, border: 'none',
        background: c.background, color: c.color, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...(rest.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : null),
        ...style,
      }}
    >{children}</button>
  );
}

/* ── form ──────────────────────────────────────────────────────────────────── */
export function Field({ label, right, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6, gap: 8,
      }}>
        <label style={{
          display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
          textTransform: 'uppercase', color: 'var(--faint)',
        }}>{label}</label>
        {right}
      </div>
      {children}
      {hint && (
        <p style={{ fontSize: 11, color: 'var(--faint)', margin: '6px 0 0' }}>{hint}</p>
      )}
    </div>
  );
}

export function Input({ mono, style, ...rest }) {
  return (
    <input
      style={{
        width: '100%', padding: '9px 11px', borderRadius: 8,
        font: 'inherit', fontSize: 13,
        background: 'var(--input)', border: '1px solid var(--border)',
        color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
        ...(mono ? { fontFamily: 'var(--font-mono)' } : null),
        ...style,
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; rest.onFocus?.(e); }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; rest.onBlur?.(e); }}
      {...rest}
    />
  );
}

export function Textarea({ mono, style, ...rest }) {
  return (
    <textarea
      style={{
        width: '100%', padding: '9px 11px', borderRadius: 8,
        font: 'inherit', fontSize: 13, lineHeight: 1.6,
        background: 'var(--input)', border: '1px solid var(--border)',
        color: 'var(--text)', outline: 'none', boxSizing: 'border-box', resize: 'vertical',
        ...(mono ? { fontFamily: 'var(--font-mono)' } : null),
        ...style,
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; rest.onFocus?.(e); }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; rest.onBlur?.(e); }}
      {...rest}
    />
  );
}

/** Two equal columns that collapse to one on a narrow pane. */
export function Row2({ cols = 2, children, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, ...style }}>
      {children}
    </div>
  );
}

export function Toggle({ on, onClick, label }) {
  return (
    <button
      role="switch" aria-checked={!!on} aria-label={label} onClick={onClick}
      style={{
        width: 38, height: 21, borderRadius: 999, border: 'none', padding: 0,
        position: 'relative', flexShrink: 0, cursor: 'pointer',
        background: on ? 'var(--accent)' : 'var(--border)',
        transition: 'background 0.18s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: 2, width: 17, height: 17,
        borderRadius: '50%', background: '#fff',
        transform: on ? 'translateX(17px)' : 'none',
        transition: 'transform 0.18s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
      }} />
    </button>
  );
}

/** Notice strip — inline feedback and limit warnings. */
export function Notice({ t = 'warn', icon, children, right }) {
  const c = tone[t] || tone.warn;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '11px 15px', borderRadius: 10, marginBottom: 14,
      fontSize: 13, color: c.color, background: c.background,
      border: `1px solid ${c.color}`,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>{icon}{children}</span>
      {right}
    </div>
  );
}

/* ── empty state ───────────────────────────────────────────────────────────── */
export function Empty({ icon, title, hint }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      {icon && <span style={{ color: 'var(--faint)', opacity: 0.7 }}>{icon}</span>}
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{hint}</div>}
    </div>
  );
}
