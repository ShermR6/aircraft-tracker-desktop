/**
 * Integration brand marks.
 *
 * Discord, Telegram and Google Chat paths are the official marks, taken
 * verbatim from the `simple-icons` package along with each brand's own hex.
 * Slack and Microsoft are not in that package — both companies had their marks
 * removed over trademark policy — so those two are drawn here and should be
 * checked against each company's brand kit before any public release.
 *
 * Channels that are protocols rather than companies (Email, SMS, Webhook,
 * WhatsApp) get a neutral outline icon instead of a logo. That difference is
 * deliberate: at a glance it separates third-party services that need an
 * account and a token from plain delivery methods.
 */
import React from 'react';

function Mark({ path, color, size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function Outline({ d, size }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true"
    >{d}</svg>
  );
}

const DISCORD = 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z';

const TELEGRAM = 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z';

const GOOGLE_CHAT = 'M1.637 0C.733 0 0 .733 0 1.637v16.5c0 .904.733 1.636 1.637 1.636h3.955v3.323c0 .804.97 1.207 1.539.638l3.963-3.96h11.27c.903 0 1.636-.733 1.636-1.637V5.592L18.408 0Zm3.955 5.592h12.816v8.59H8.455l-2.863 2.863Z';

export function Logo({ type, size = 17 }) {
  switch (type) {
    case 'discord':
      return <Mark path={DISCORD} color="#5865F2" size={size} />;

    case 'telegram':
      return <Mark path={TELEGRAM} color="#26A5E4" size={size} />;

    case 'google_chat':
      return <Mark path={GOOGLE_CHAT} color="#34A853" size={size} />;

    // Slack — the four-colour mark, drawn from its published geometry.
    case 'slack':
      return (
        <svg viewBox="0 0 127 127" width={size} height={size} aria-hidden="true">
          <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80z" fill="#E01E5A" />
          <path d="M33.8 80c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A" />
          <path d="M47 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.7 39.7.8 47 .8c7.3 0 13.2 5.9 13.2 13.2v13.2H47z" fill="#36C5F0" />
          <path d="M47 33.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H14C6.7 60.2.8 54.3.8 47c0-7.3 5.9-13.2 13.2-13.2h33z" fill="#36C5F0" />
          <path d="M99.8 47c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.8V47z" fill="#2EB67D" />
          <path d="M93.2 47c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V14C66.8 6.7 72.7.8 80 .8c7.3 0 13.2 5.9 13.2 13.2v33z" fill="#2EB67D" />
          <path d="M80 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8H80z" fill="#ECB22E" />
          <path d="M80 93.2c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80z" fill="#ECB22E" />
        </svg>
      );

    // Microsoft Teams — simplified from the official mark.
    case 'teams':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path d="M13.6 6.6h8.1c.7 0 1.3.6 1.3 1.3v5.3a4.4 4.4 0 0 1-4.4 4.4h-.8a4.3 4.3 0 0 1-4.2-3.4V6.6Z" fill="#5059C9" />
          <circle cx="19.5" cy="3.7" r="2.3" fill="#5059C9" />
          <circle cx="12.2" cy="4" r="2.7" fill="#7B83EB" />
          <path d="M16 6.6H4.7c-.6 0-1.1.5-1.1 1.1v7.1a6 6 0 0 0 12 0V7.7c0-.6-.5-1.1-1.1-1.1Z" fill="#7B83EB" />
          <rect x="1" y="7" width="11.2" height="11.2" rx="1.2" fill="#4B53BC" />
          <path d="M9.8 9.8H3.6v1.5h2.2v6h1.8v-6h2.2V9.8Z" fill="#fff" />
        </svg>
      );

    // Protocols, not companies — neutral icons.
    case 'email':
      return <Outline size={size} d={<><rect x="2" y="4.5" width="20" height="15" rx="2.5" /><path d="m2.8 6.5 8.5 6a1.2 1.2 0 0 0 1.4 0l8.5-6" /></>} />;

    case 'sms':
      return <Outline size={size} d={<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.8-.4L3 21l1.5-4.1A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />} />;

    case 'webhook':
      return <Outline size={size} d={<path d="m8 6-6 6 6 6M16 6l6 6-6 6M13.5 4l-3 16" />} />;

    case 'whatsapp':
      return <Outline size={size} d={<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.8-.4L3 21l1.5-4.1A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />} />;

    default:
      return <Outline size={size} d={<><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>} />;
  }
}

/** Logo on a neutral chip — the standard presentation in integration lists. */
export function LogoChip({ type, size = 32 }) {
  const generic = ['email', 'sms', 'webhook', 'whatsapp'].includes(type);
  return (
    <span style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--panel-2)', border: '1px solid var(--border-soft)',
      color: generic ? 'var(--dim, var(--muted))' : undefined,
    }}>
      <Logo type={type} size={Math.round(size * 0.53)} />
    </span>
  );
}
