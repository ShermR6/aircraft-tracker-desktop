// src/config/tierLimits.js

export const TIER_LIMITS = {
  starter: {
    aircraft: 3,
    integrations: 1,
  },
  premium: {
    aircraft: 10,
    integrations: 3,
  },
  pro: {
    aircraft: Infinity,
    integrations: Infinity,
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

export function getLimitDisplay(value) {
  return value === Infinity ? 'Unlimited' : value;
}
