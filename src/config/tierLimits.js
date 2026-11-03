// src/config/tierLimits.js
//
// Mirrors TIER_LIMITS in both backends' main.py — keep the two in step. The
// backend is what actually enforces these; this table only decides what the UI
// offers. A client limit lower than the backend's silently hides paid capacity,
// and one that is higher lets a user build something the server then rejects.
//
// Infinity stands in for the backend's None (unlimited).

const ALL_CHANNELS = [
  'discord', 'email', 'slack', 'teams',
  'google_chat', 'sms', 'telegram', 'webhook',
];

export const TIER_LIMITS = {
  starter: { aircraft: 3,  integrations: 1, zones: 2, locations: 1,        allowedChannels: ['discord', 'email'] },
  premium: { aircraft: 7,  integrations: 3, zones: 5, locations: 5,        allowedChannels: ['discord', 'email', 'slack', 'teams', 'google_chat'] },
  pro:     { aircraft: 15, integrations: 5, zones: 7, locations: Infinity, allowedChannels: ALL_CHANNELS },

  // Team plans are not "the personal plan with more aircraft" — they have their
  // own ladder, so they must be matched exactly rather than by stripping the
  // team- prefix. team-pro in particular is unlimited, not pro's 15.
  'team-starter': { aircraft: 25,       integrations: 3,        zones: 2,        locations: 3,        allowedChannels: ['discord', 'email'] },
  'team-premium': { aircraft: 75,       integrations: 10,       zones: 5,        locations: 10,       allowedChannels: ALL_CHANNELS },
  'team-pro':     { aircraft: Infinity, integrations: Infinity, zones: Infinity, locations: Infinity, allowedChannels: ALL_CHANNELS },

  // Internal owner tier — never sold. Unlimited everything, every channel.
  owner: { aircraft: Infinity, integrations: Infinity, zones: Infinity, locations: Infinity, allowedChannels: ALL_CHANNELS },
};

export function getLimits(tier) {
  const key = (tier || '').toLowerCase().trim();
  // Exact match first, so owner and each team- tier get their own limits.
  if (TIER_LIMITS[key]) return TIER_LIMITS[key];
  // Unknown team- variant: fall back to its base tier, then to starter.
  return TIER_LIMITS[key.replace(/^team-/, '')] || TIER_LIMITS.starter;
}

export function isAtLimit(tier, type, currentCount) {
  const limits = getLimits(tier);
  return currentCount >= limits[type];
}

export function isChannelAllowed(tier, channelType) {
  const limits = getLimits(tier);
  return limits.allowedChannels.includes(channelType);
}

export function getLimitDisplay(value) {
  return value === Infinity ? 'Unlimited' : value;
}
