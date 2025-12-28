// src/handlers/language.js
import { mainMenuKb } from '../ui/keyboards.js';
import { upsertProfile } from '../storage/profiles.js';
import { t } from '../i18n/t.js';

export function registerLanguage(bot, { userState }) {
  bot.action(/^SET_LANG:(UA|RU|EN)$/, async (ctx) => {
    const lang = ctx.match[1];

    // сохраняем язык
    await upsertProfile(ctx.from.id, { language: lang });
    userState.set(ctx.from.id, { mode: 'idle' });

    // убираем "часики"
    await ctx.answerCbQuery();

    // редактируем сообщение выбора языка, чтобы не плодить чат
    try {
      await ctx.editMessageText(t('language.saved', lang));
    } catch {
      // если редактирование невозможно — просто молча продолжаем
    }

    // показываем домашний экран на выбранном языке
    await ctx.reply(t('home.welcome', lang), mainMenuKb);
  });
}
