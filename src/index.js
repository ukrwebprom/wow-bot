import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN not found in .env');
  process.exit(1);
}

const bot = new Telegraf(token);

// простое состояние по пользователям (в памяти)
const userState = new Map(); // telegramId -> { mode: 'idle'|'await_post' }

bot.start(async (ctx) => {
  userState.set(ctx.from.id, { mode: 'idle' });
  await ctx.reply(
    `Привет 👋\n` +
    `Пришли пост на анализ командой /analyze\n\n` +
    `Команды:\n` +
    `/analyze — начать анализ\n` +
    `/cancel — отменить`
  );
});

bot.command('analyze', async (ctx) => {
  userState.set(ctx.from.id, { mode: 'await_post' });
  await ctx.reply('Ок. Пришли текст поста одним сообщением (или фото с подписью).');
});

bot.command('cancel', async (ctx) => {
  userState.set(ctx.from.id, { mode: 'idle' });
  await ctx.reply('Отменил ✅');
});

// ТЕКСТ
bot.on('text', async (ctx) => {
  const txt = ctx.message.text;

  // 1) никогда не считаем команды текстом поста
  if (txt.startsWith('/')) return;

  const state = userState.get(ctx.from.id)?.mode ?? 'idle';

  // 2) если не в режиме анализа — подсказываем
  if (state !== 'await_post') {
    await ctx.reply('Чтобы сделать анализ — нажми /analyze 🙂');
    return;
  }

  const postText = txt;

  const result = {
    strengths: ['Clear topic', 'Readable structure'],
    issues: ['Weak hook in the first line', 'No explicit call to comment/save'],
    recommendations: [
      'Start with a stronger first sentence (conflict/curiosity).',
      'Add a direct question at the end to trigger replies.'
    ],
    meta: { length: postText.length }
  };

  userState.set(ctx.from.id, { mode: 'idle' });

  await ctx.reply(
    `✅ Принял пост.\n\n` +
      `**Strengths:**\n- ${result.strengths.join('\n- ')}\n\n` +
      `**Issues:**\n- ${result.issues.join('\n- ')}\n\n` +
      `**Recommendations:**\n- ${result.recommendations.join('\n- ')}`,
    { parse_mode: 'Markdown' }
  );
});

// ФОТО
bot.on('photo', async (ctx) => {
  const state = userState.get(ctx.from.id)?.mode ?? 'idle';

  if (state !== 'await_post') {
    await ctx.reply('Фото для анализа отправляй после /analyze 🙂');
    return;
  }

  const caption = ctx.message.caption ?? '';
  const photos = ctx.message.photo;
  const best = photos[photos.length - 1];
  const fileId = best.file_id;

  userState.set(ctx.from.id, { mode: 'idle' });

  await ctx.reply(
    `✅ Принял пост с фото.\n` +
    `caption: ${caption || '(empty)'}\n` +
    `file_id: ${fileId}`
  );
});


await bot.launch();
console.log('🤖 Bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
