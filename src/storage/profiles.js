import { pool } from '../db/pool.js';

// что считаем "профайл заполнен"
const REQUIRED_FIELDS = ['language', 'platform', 'goal', 'voice', 'niche'];

export async function getProfile(userId) {
  const { rows } = await pool.query(
    `SELECT user_id, language, platform, goal, voice, niche, boundaries
     FROM user_profiles
     WHERE user_id = $1`,
    [String(userId)]
  );

  if (!rows.length) return null;

  const r = rows[0];
  return {
    userId: Number(r.user_id),
    language: r.language ?? null,
    platform: r.platform ?? null,
    goal: r.goal ?? null,
    voice: r.voice ?? null,
    niche: r.niche ?? null,
    boundaries: Array.isArray(r.boundaries) ? r.boundaries : (r.boundaries ?? []),
  };
}

export async function upsertProfile(userId, patch) {
  const current = (await getProfile(userId)) ?? { boundaries: [] };
  const next = { ...current, ...patch };

  // boundaries: если patch.boundaries не передали — оставляем как было
  if (patch.boundaries === undefined) next.boundaries = current.boundaries ?? [];

  await pool.query(
    `INSERT INTO user_profiles (user_id, language, platform, goal, voice, niche, boundaries, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       language   = EXCLUDED.language,
       platform   = EXCLUDED.platform,
       goal       = EXCLUDED.goal,
       voice      = EXCLUDED.voice,
       niche      = EXCLUDED.niche,
       boundaries = EXCLUDED.boundaries,
       updated_at = NOW()`,
    [
      String(userId),
      next.language,
      next.platform,
      next.goal,
      next.voice,
      next.niche,
      JSON.stringify(next.boundaries ?? []),
    ]
  );

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
