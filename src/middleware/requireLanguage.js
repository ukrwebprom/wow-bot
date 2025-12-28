import { languageSelectKb } from '../ui/keyboards.js';
import { getProfile } from '../storage/profiles.js';
import { t } from '../i18n/t.js';

export async function requireLanguage(ctx) {
  const profile = await getProfile(ctx.from.id);

  if (!profile?.language) {

    if (ctx.callbackQuery) {
      try { await ctx.answerCbQuery(); } catch {}
    }

    await ctx.reply(t('language.choose', 'EN'), languageSelectKb);
    return { ok: false, profile: null };
  }

  return { ok: true, profile };
}
