import { getProfile } from '../storage/profiles.js';

export async function getLang(userId) {
  return (await getProfile(userId))?.language ?? 'EN';
}
