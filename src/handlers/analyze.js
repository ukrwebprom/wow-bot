import { cancelKb, mainMenuKb } from '../ui/keyboards.js';
import { analyzePost } from "../services/openai.js";
import { getProfile } from '../storage/profiles.js';
import { formatResultHtml } from '../utils/formatResult.js';
import { requireLanguage } from '../middleware/requireLanguage.js';
import { t } from '../i18n/t.js';

export function registerAnalyzeHandlers(bot, { userState }) {

  bot.command('analyze', async (ctx) => {
    userState.set(ctx.from.id, { mode: 'await_post' });

    const gate = await requireLanguage(ctx);
    if (!gate.ok) return;
    
    const lang = gate.profile.language;
    await ctx.reply(t('analyze.sendDraft', lang), cancelKb);
  });

  bot.action('ANALYZE', async (ctx) => {
    userState.set(ctx.from.id, { mode: 'await_post' });

    const gate = await requireLanguage(ctx);
    if (!gate.ok) return;

    const lang = gate.profile.language;
    await ctx.reply(t('analyze.sendDraft', lang), cancelKb);
  });

  bot.action('CANCEL', async (ctx) => {
    userState.set(ctx.from.id, { mode: 'idle' });
    await ctx.answerCbQuery('Cancelled');

    try { await ctx.deleteMessage(); } catch {}
  });

  // ТЕКСТ
bot.on('text', async (ctx) => {
  const txt = ctx.message.text;
  console.log(txt);

  // 1) никогда не считаем команды текстом поста
  if (txt.startsWith('/')) return;

  const state = userState.get(ctx.from.id)?.mode ?? 'idle';

  // 2) если не в режиме анализа — подсказываем
  if (state !== 'await_post') {
    await ctx.reply('Чтобы сделать анализ — нажми /analyze 🙂',
        mainMenuKb
    );
    return;
  }

  const postText = txt;

  const profile = await getProfile(ctx.from.id);


  let statusMsg;
  try {
    statusMsg = await ctx.reply("🧠 Анализирую...");
    const result = await analyzePost({ text: postText, imageUrl: null, profile });
    // отправляешь красиво
    await ctx.reply(formatResultHtml(result), { parse_mode: 'HTML', ...mainMenuKb });
  } catch (e) {
    console.error(e);
    await ctx.reply("❌ Не получилось сделать анализ (ошибка API или JSON). Попробуй ещё раз.", mainMenuKb);
  } finally {
    try { await ctx.deleteMessage(statusMsg.message_id); } catch {}
  }

  userState.set(ctx.from.id, { mode: 'idle' });

});

// ФОТО
bot.on('photo', async (ctx) => {
  const state = userState.get(ctx.from.id)?.mode ?? 'idle';

  if (state !== 'await_post') {
    await ctx.reply('Фото для анализа отправляй после /analyze 🙂');
    return;
  }

  const link = await ctx.telegram.getFileLink(fileId);
  const imageUrl = link.href; // URL картинки на серверах Telegram

  const profile = await getProfile(ctx.from.id);

  userState.set(ctx.from.id, { mode: 'idle' });

  let statusMsg;
  try {
    statusMsg = await ctx.reply("🧠 Анализирую...");
    const result = await analyzePost({ text: caption, imageUrl, profile });
    // отправляешь красиво
    await ctx.reply(formatResultHtml(result), { parse_mode: 'HTML', ...mainMenuKb });
  } catch (e) {
    console.error(e);
    await ctx.reply("❌ Не получилось сделать анализ (ошибка API или JSON). Попробуй ещё раз.", mainMenuKb);
  } finally {
    try { await ctx.deleteMessage(statusMsg.message_id); } catch {}
  }


});
}
