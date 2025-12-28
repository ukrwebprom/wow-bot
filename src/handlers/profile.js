import {
  mainMenuKb,
  profileEmptyKb,
  profileCompleteKb,
  wizardCancelKb,
  languageKb,
  platformKb,
  goalKb,
  voiceKb,
  nicheKb,
  boundariesKb,
} from '../ui/keyboards.js';

import {
  getProfile,
  upsertProfile,
  isProfileComplete,
  formatProfile,
} from '../storage/profiles.js';
import { requireLanguage } from '../middleware/requireLanguage.js';
import { t } from '../i18n/t.js';
import { getLang } from '../utils/getLang.js';

export function registerProfile(bot, { userState }) {
  bot.action('PROFILE', async (ctx) => {
    await ctx.answerCbQuery();

    const gate = await requireLanguage(ctx);
    if (!gate.ok) return;

    const userId = ctx.from.id;
    const profile = await getProfile(userId);

    if (isProfileComplete(profile)) {
      await ctx.reply(formatProfile(profile), profileCompleteKb);
    } else {
      const lang = await getLang(ctx.from.id);

      await ctx.reply(
        `${t('profile.empty.title', lang)}\n\n${t('profile.empty.desc', lang)}`,
        profileEmptyKb
      );
    }
  });

// Enter / Edit → старт мастера
  bot.action(['PROFILE_ENTER', 'PROFILE_EDIT'], async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    userState.set(userId, { mode: 'profile_language' });

    const profile = await getProfile(userId) ?? {};
    const lang = await getLang(ctx.from.id); // если языка ещё нет — будет EN
    await safeEditOrReply(ctx, t('profile.wizard.step1_language', lang), languageKb(profile.language));
  });

  // EXIT (выйти из мастера)
  bot.action('P_EXIT', async (ctx) => {
    const lang = await getLang(ctx.from.id);
    await ctx.answerCbQuery(t('profile.wizard.exited', lang));
    userState.set(ctx.from.id, { mode: 'idle' });

    // по желанию: удаляем экран мастера
    try {
      await ctx.editMessageText(t('home.welcome', lang), mainMenuKb);
    } catch {
      await ctx.reply(t('home.welcome', lang), mainMenuKb);
    }
  });

  // Назад по шагам мастера
  bot.action(/^P_BACK:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const where = ctx.match[1]; // LANG / PLATFORM / GOAL / VOICE / NICHE
    const userId = ctx.from.id;
    const p = await getProfile(userId) ?? {};
    const lang = await getLang(ctx.from.id);

    if (where === 'LANG') {
      userState.set(userId, { mode: 'profile_language' });
      await safeEditOrReply(ctx, t('profile.wizard.step1_language', lang), languageKb(profile.language));
      return;
    }
    if (where === 'PLATFORM') {
      userState.set(userId, { mode: 'profile_platform' });
      await safeEditOrReply(ctx, t('profile.wizard.step2_platform', lang), platformKb(p.platform));
      return;
    }
    if (where === 'GOAL') {
      userState.set(userId, { mode: 'profile_goal' });
      await safeEditOrReply(ctx, t('profile.wizard.step3_goal', lang), goalKb(p.goal));
      return;
    }
    if (where === 'VOICE') {
      userState.set(userId, { mode: 'profile_voice' });
      await safeEditOrReply(ctx, t('profile.wizard.step4_voice', lang), voiceKb(p.voice));
      return;
    }
    if (where === 'NICHE') {
      userState.set(userId, { mode: 'profile_niche' });
      await safeEditOrReply(ctx, t('profile.wizard.step5_niche', lang), nicheKb(p.niche));
      return;
    }
  });

  // Step 1: Language
  bot.action(/^P_LANG:(RU|UA|EN)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const lang = ctx.match[1];

    await upsertProfile(userId, { language: lang });
    userState.set(userId, { mode: 'profile_platform' });

    const p = await getProfile(userId);
    await safeEditOrReply(ctx, t('profile.wizard.step2_platform', lang), platformKb(p.platform));
  });

  // Step 2: Platform
  bot.action(/^P_PLATFORM:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const platform = ctx.match[1];

    await upsertProfile(userId, { platform });
    userState.set(userId, { mode: 'profile_goal' });

    const p = await getProfile(userId);
    const lang = await getLang(ctx.from.id);
    await safeEditOrReply(ctx, t('profile.wizard.step3_goal', lang), goalKb(p.goal));
  });

  // Step 3: Goal
  bot.action(/^P_GOAL:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const goal = decode(ctx.match[1]);

    await upsertProfile(userId, { goal });
    userState.set(userId, { mode: 'profile_voice' });

    const p = await getProfile(userId);
    const lang = await getLang(ctx.from.id);
    await safeEditOrReply(ctx, t('profile.wizard.step4_voice', lang), voiceKb(p.voice));
  });

  // Step 4: Voice
  bot.action(/^P_VOICE:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const voice = decode(ctx.match[1]);

    await upsertProfile(userId, { voice });
    userState.set(userId, { mode: 'profile_niche' });

    const p = await getProfile(userId);
    const lang = await getLang(ctx.from.id);
    await safeEditOrReply(ctx, t('profile.wizard.step5_niche', lang), nicheKb(p.niche));
  });

  // Step 5: Niche
  bot.action(/^P_NICHE:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const niche = decode(ctx.match[1]);

    await upsertProfile(userId, { niche });
    userState.set(userId, { mode: 'profile_boundaries' });

    const p = await getProfile(userId);
    const lang = await getLang(ctx.from.id);
    await safeEditOrReply(ctx, t('profile.wizard.step6_boundaries', lang), boundariesKb(p.boundaries ?? []));
  });

  // Step 6: Boundaries toggle
  bot.action(/^P_BOUND:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const id = ctx.match[1];

    const p = await getProfile(userId) ?? {};
    const cur = Array.isArray(p.boundaries) ? p.boundaries : [];
    const set = new Set(cur);

    if (set.has(id)) set.delete(id);
    else set.add(id);

    const next = Array.from(set);
    await upsertProfile(userId, { boundaries: next });
    const lang = await getLang(ctx.from.id);
    await safeEditOrReply(
      ctx,
      t('profile.wizard.step6_boundaries', lang),
      boundariesKb(next)
    );
  });

  // Done boundaries → показать итог
  bot.action('P_BOUND_DONE', async (ctx) => {
    await ctx.answerCbQuery('Saved');

    const userId = ctx.from.id;
    userState.set(userId, { mode: 'idle' });

    const p = await getProfile(userId);
    const lang = await getLang(ctx.from.id);
    await safeEditOrReply(ctx, `${t('profile.wizard.saved', lang)}\n\n${formatProfile(p)}`, profileCompleteKb);
  });

  // BACK (общий) — вернуться в главное меню
  bot.action('BACK', async (ctx) => {
    await ctx.answerCbQuery();
    userState.set(ctx.from.id, { mode: 'idle' });

    const profile = await getProfile(ctx.from.id);
    const lang = profile?.language ?? 'EN';
    try {
      await ctx.editMessageText(t('home.welcome', lang), mainMenuKb);
    } catch {
      await ctx.reply(t('home.welcome', lang), mainMenuKb);
    }
  });
}

// --- helpers ---
function decode(s) {
  return s.replaceAll('_', ' ');
}

async function safeEditOrReply(ctx, text, keyboard) {
  // При нажатии inline-кнопок лучше редактировать тот же месседж.
  // Но если редактирование невозможно — просто отвечаем новым сообщением.
  try {
    await ctx.editMessageText(text, keyboard);
  } catch {
    await ctx.reply(text, keyboard ?? wizardCancelKb);
  }
}
