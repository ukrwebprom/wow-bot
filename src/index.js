import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { registerStart } from './handlers/start.js';
import { registerAnalyzeHandlers } from './handlers/analyze.js';
import { registerProfile } from './handlers/profile.js';
import { registerLanguage } from './handlers/language.js';
import { initDb } from './db/init.js';
import { startHttpServer } from './server/httpServer.js';
import { upsertUserFromCtx } from './storage/users.js';


const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN not found in .env');
  process.exit(1);
}

const bot = new Telegraf(token);
await initDb();
const userState = new Map();
// const profiles = new Map();

bot.use(async (ctx, next) => {
  try {
    await upsertUserFromCtx(ctx);
  } catch (e) {
    console.error('upsertUserFromCtx error:', e);
  }
  return next();
});

registerStart(bot, { userState });
registerAnalyzeHandlers(bot, { userState });
registerProfile(bot, { userState });
registerLanguage(bot, { userState });

startHttpServer();

await bot.launch();
console.log('🤖 Bot is running...');


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
