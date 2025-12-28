import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { registerStart } from './handlers/start.js';
import { registerAnalyzeHandlers } from './handlers/analyze.js';
import { registerProfile } from './handlers/profile.js';
import { registerLanguage } from './handlers/language.js';
import { initDb } from './db/init.js';
import http from 'http';

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
}).listen(PORT, () => {
  console.log(`🌐 Health server running on :${PORT}`);
});

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN not found in .env');
  process.exit(1);
}

const bot = new Telegraf(token);
await initDb();
const userState = new Map();
// const profiles = new Map();

registerStart(bot, { userState });
registerAnalyzeHandlers(bot, { userState });
registerProfile(bot, { userState });
registerLanguage(bot, { userState });

await bot.launch();
console.log('🤖 Bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
