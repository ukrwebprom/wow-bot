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

export function registerProfile(bot, { userState }) {
  bot.action('PROFILE', async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const profile = getProfile(userId);

    if (isProfileComplete(profile)) {
      await ctx.reply(formatProfile(profile), profileCompleteKb);
    } else {
      await ctx.reply(
        `👤 Profile is empty.\n\n` +
          `To analyze posts better, please fill in your profile — it helps the bot adapt results to your goals, tone, and platform.`,
        profileEmptyKb
      );
    }
  });

// Enter / Edit → старт мастера
  bot.action(['PROFILE_ENTER', 'PROFILE_EDIT'], async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    userState.set(userId, { mode: 'profile_language' });

    const profile = getProfile(userId) ?? {};
    await safeEditOrReply(
      ctx,
      `Step 1/6 — Language\nChoose your language:`,
      languageKb(profile.language)
    );
  });

  // EXIT (выйти из мастера)
  bot.action('P_EXIT', async (ctx) => {
    await ctx.answerCbQuery('Exited');
    userState.set(ctx.from.id, { mode: 'idle' });

    // по желанию: удаляем экран мастера
    try { await ctx.deleteMessage(); } catch {}

    await ctx.reply('Главное меню:', mainMenuKb);
  });

  // Назад по шагам мастера
  bot.action(/^P_BACK:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const where = ctx.match[1]; // LANG / PLATFORM / GOAL / VOICE / NICHE
    const userId = ctx.from.id;
    const p = getProfile(userId) ?? {};

    if (where === 'LANG') {
      userState.set(userId, { mode: 'profile_language' });
      await safeEditOrReply(ctx, `Step 1/6 — Language\nChoose your language:`, languageKb(p.language));
      return;
    }
    if (where === 'PLATFORM') {
      userState.set(userId, { mode: 'profile_platform' });
      await safeEditOrReply(ctx, `Step 2/6 — Platform\nChoose your main platform:`, platformKb(p.platform));
      return;
    }
    if (where === 'GOAL') {
      userState.set(userId, { mode: 'profile_goal' });
      await safeEditOrReply(ctx, `Step 3/6 — Goal\nWhat do you want from this post?`, goalKb(p.goal));
      return;
    }
    if (where === 'VOICE') {
      userState.set(userId, { mode: 'profile_voice' });
      await safeEditOrReply(ctx, `Step 4/6 — Voice\nHow should you sound?`, voiceKb(p.voice));
      return;
    }
    if (where === 'NICHE') {
      userState.set(userId, { mode: 'profile_niche' });
      await safeEditOrReply(ctx, `Step 5/6 — Niche\nWhat is your main topic?`, nicheKb(p.niche));
      return;
    }
  });

  // Step 1: Language
  bot.action(/^P_LANG:(RU|UA|EN)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const lang = ctx.match[1];

    upsertProfile(userId, { language: lang });
    userState.set(userId, { mode: 'profile_platform' });

    const p = getProfile(userId);
    await safeEditOrReply(ctx, `Step 2/6 — Platform\nChoose your main platform:`, platformKb(p.platform));
  });

  // Step 2: Platform
  bot.action(/^P_PLATFORM:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const platform = ctx.match[1];

    upsertProfile(userId, { platform });
    userState.set(userId, { mode: 'profile_goal' });

    const p = getProfile(userId);
    await safeEditOrReply(ctx, `Step 3/6 — Goal\nWhat do you want from this post?`, goalKb(p.goal));
  });

  // Step 3: Goal
  bot.action(/^P_GOAL:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const goal = decode(ctx.match[1]);

    upsertProfile(userId, { goal });
    userState.set(userId, { mode: 'profile_voice' });

    const p = getProfile(userId);
    await safeEditOrReply(ctx, `Step 4/6 — Voice\nHow should you sound?`, voiceKb(p.voice));
  });

  // Step 4: Voice
  bot.action(/^P_VOICE:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const voice = decode(ctx.match[1]);

    upsertProfile(userId, { voice });
    userState.set(userId, { mode: 'profile_niche' });

    const p = getProfile(userId);
    await safeEditOrReply(ctx, `Step 5/6 — Niche\nWhat is your main topic?`, nicheKb(p.niche));
  });

  // Step 5: Niche
  bot.action(/^P_NICHE:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const niche = decode(ctx.match[1]);

    upsertProfile(userId, { niche });
    userState.set(userId, { mode: 'profile_boundaries' });

    const p = getProfile(userId);
    await safeEditOrReply(
      ctx,
      `Step 6/6 — Boundaries\nSelect what to avoid (you can pick multiple):`,
      boundariesKb(p.boundaries ?? [])
    );
  });

  // Step 6: Boundaries toggle
  bot.action(/^P_BOUND:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const userId = ctx.from.id;
    const id = ctx.match[1];

    const p = getProfile(userId) ?? {};
    const cur = Array.isArray(p.boundaries) ? p.boundaries : [];
    const set = new Set(cur);

    if (set.has(id)) set.delete(id);
    else set.add(id);

    const next = Array.from(set);
    upsertProfile(userId, { boundaries: next });

    await safeEditOrReply(
      ctx,
      `Step 6/6 — Boundaries\nSelect what to avoid (you can pick multiple):`,
      boundariesKb(next)
    );
  });

  // Done boundaries → показать итог
  bot.action('P_BOUND_DONE', async (ctx) => {
    await ctx.answerCbQuery('Saved');

    const userId = ctx.from.id;
    userState.set(userId, { mode: 'idle' });

    const p = getProfile(userId);
    await safeEditOrReply(ctx, `✅ Profile saved!\n\n${formatProfile(p)}`, profileCompleteKb);
  });

  // BACK (общий) — вернуться в главное меню
  bot.action('BACK', async (ctx) => {
    await ctx.answerCbQuery();
    userState.set(ctx.from.id, { mode: 'idle' });
    await ctx.reply('Главное меню:', mainMenuKb);
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
