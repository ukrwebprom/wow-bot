import { mainMenuKb } from '../ui/keyboards.js';

export function registerStart(bot, { userState }) {
  bot.start(async (ctx) => {
    userState.set(ctx.from.id, { mode: 'idle' });
    await ctx.reply(
      `Привет 👋\nПришли пост на анализ командой /analyze\n\nКоманды:\n/analyze — начать анализ\n/cancel — отменить`,
      mainMenuKb
    );
  });
}
