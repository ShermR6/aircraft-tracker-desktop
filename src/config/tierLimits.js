// src/config/tierLimits.js

export const TIER_LIMITS = {
  starter: {
    aircraft: 3,
    integrations: 2,
    allowedChannels: ['discord', 'email'],
  },
  premium: {
    aircraft: 7,
    integrations: 4,
    allowedChannels: ['discord', 'email', 'slack', 'teams', 'google_chat'],
  },
  pro: {
    aircraft: 15,
    integrations: 5,
    allowedChannels: ['discord', 'email', 'slack', 'teams', 'google_chat', 'sms', 'telegram', 'webhook'],
  },
};

export function getLimits(tier) {
  const key = (tier || '').toLowerCase();
  return TIER_LIMITS[key] || TIER_LIMITS.starter;
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
