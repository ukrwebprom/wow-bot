const profiles = new Map(); // telegramId -> profile

const REQUIRED_FIELDS = ['language', 'platform', 'goal', 'voice', 'niche'];

export function getProfile(userId) {
  return profiles.get(userId) ?? null;
}

export function setProfile(userId, profile) {
  profiles.set(userId, profile);
}

export function upsertProfile(userId, patch) {
  const current = profiles.get(userId) ?? {};
  const next = { ...current, ...patch };
  profiles.set(userId, next);
  return next;
}

export function isProfileComplete(profile) {
  if (!profile) return false;
  return REQUIRED_FIELDS.every((k) => Boolean(profile[k]));
}

export function formatProfile(profile) {
  const boundaries = Array.isArray(profile.boundaries) && profile.boundaries.length
    ? profile.boundaries.join(', ')
    : '—';

  return (
    `👤 Profile\n\n` +
    `Language: ${profile.language ?? '—'}\n` +
    `Platform: ${profile.platform ?? '—'}\n` +
    `Goal: ${profile.goal ?? '—'}\n` +
    `Voice: ${profile.voice ?? '—'}\n` +
    `Niche: ${profile.niche ?? '—'}\n` +
    `Boundaries: ${boundaries}\n`
  );
}
