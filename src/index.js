// src/index.js
import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import OpenAI from 'openai';

import { initDb } from './db/init.js';
import { pool } from './db/pool.js';
import { startHttpServer } from './server/httpServer.js';
import { upsertUserFromCtx } from './storage/users.js';

import { buildMessages as buildV1 } from './prompts/packs/v1_current.js';
import { buildMessages as buildV2 } from './prompts/packs/v2_hooked.js';

const PROMPT_PACKS = { v1: buildV1, v2: buildV2 };
function getPromptPack() {
  const name = process.env.PROMPT_PACK || 'v1';
  return PROMPT_PACKS[name] || PROMPT_PACKS.v1;
}

// -------------------- CONFIG --------------------
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN not found in .env');
  process.exit(1);
}

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error('❌ OPENAI_API_KEY not found in .env');
  process.exit(1);
}

const MODEL_FAST = process.env.OPENAI_MODEL_FAST || 'gpt-4.1-mini';
const MODEL_PREMIUM = process.env.OPENAI_MODEL_PREMIUM || 'gpt-4.1';

const PREMIUM_PRESETS = new Set([
  'remarque',
  'ayn_rand',
  'chekhov',
  'kafka',
  'bukowski',
]);

const openai = new OpenAI({ apiKey: openaiKey });
const bot = new Telegraf(token);

// -------------------- DB: events table --------------------
async function ensureEventsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wow_events (
      id           BIGSERIAL PRIMARY KEY,
      ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_id      BIGINT,
      event        TEXT NOT NULL,
      preset       TEXT,
      input_len    INT,
      output_len   INT,
      model        TEXT,
      ok           BOOLEAN,
      error_code   TEXT,
      error_message TEXT
    );
  `);

  // migrations (safe)
  await pool.query(`ALTER TABLE wow_events ADD COLUMN IF NOT EXISTS amount INT;`);
  await pool.query(`ALTER TABLE wow_events ADD COLUMN IF NOT EXISTS currency TEXT;`);
}


async function logEvent({
  userId,
  event,
  preset = null,
  inputLen = null,
  outputLen = null,
  model = null,
  ok = null,
  errorCode = null,
  errorMessage = null,
  amount = null,
  currency = null
}) {
  try {
    await pool.query(
  `INSERT INTO wow_events
   (user_id, event, preset, input_len, output_len, model, ok, error_code, error_message, amount, currency)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [userId, event, preset, inputLen, outputLen, model, ok, errorCode, errorMessage, amount ?? null, currency ?? null]
);
  } catch (e) {
    console.error('logEvent error:', e);
  }
}

// -------------------- IN-MEMORY SESSION --------------------
/**
 * session.get(userId) = {
 *   lastText: string,
 *   lastPreset: string,
 *   strength: number (1..3),
 * }
 */
const session = new Map();

function getSession(userId) {
  if (!session.has(userId)) {
    session.set(userId, { lastText: '', lastPreset: 'warm_story', strength: 2 });
  }
  return session.get(userId);
}

// -------------------- PRESETS --------------------
const PRESETS = [
  { id: 'remarque', title: 'Remarque' },
  { id: 'ayn_rand', title: 'Ayn Rand' },
  { id: 'chekhov', title: 'Chekhov' },
  { id: 'kafka', title: 'Kafka' },
  { id: 'bukowski', title: 'Bukowski' },
  { id: 'warm_story', title: 'Warm storytelling' },
  { id: 'ironic', title: 'Ironic blogger' },
  { id: 'expert', title: 'Concise expert' },
];

function presetTitleById(id) {
  const p = PRESETS.find((x) => x.id === id);
  return p ? p.title : id;
}

const DONATE_AMOUNTS = [10, 20, 50];

function escapeHtml(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function presetsKb() {
  const rows = [];
  for (let i = 0; i < PRESETS.length; i += 2) {
    const a = PRESETS[i];
    const b = PRESETS[i + 1];
    rows.push([
      Markup.button.callback(a.title, `P:${a.id}`),
      ...(b ? [Markup.button.callback(b.title, `P:${b.id}`)] : []),
    ]);
  }
  return Markup.inlineKeyboard(rows);
}


function afterResultKb() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Another version', 'A:VARIANT'),
      Markup.button.callback('Different style', 'A:STYLES'),
    ],
    [Markup.button.callback('💛 Support', 'DONATE:MENU')],
  ]);
}


function donateKb() {
  return Markup.inlineKeyboard([
    DONATE_AMOUNTS.map((n) => Markup.button.callback(`⭐ ${n}`, `DONATE:${n}`)),
    [Markup.button.callback('⬅️ Back', 'A:STYLES')],
  ]);
}

async function sendStarsInvoice(ctx, stars) {
  const payload = `donate_${stars}_${Date.now()}`;

  return ctx.replyWithInvoice({
    title: 'Support WOW Advisor',
    description: 'Voluntary support',
    payload,
    provider_token: '', // IMPORTANT: empty for Stars
    currency: 'XTR',    // IMPORTANT: Telegram Stars
    prices: [{ label: 'Support', amount: stars }],
  });
}



// -------------------- OPENAI REWRITE --------------------
function presetInstruction(presetId) {
  switch (presetId) {
    case 'kafka':
        return [
        'Tone: restrained, anxious, precise.',
        'Make the situation feel irrational but real.',
        'Emphasize helplessness, inevitability, and silent pressure.',
        'Do NOT add fantasy, monsters, or surreal events.',
        'Everything must remain ordinary, but subtly wrong.',
        'Short, clear sentences. No metaphors for beauty.',
        'Ending: a quiet, unsettling realization.',
        ].join('\n');

    case 'bukowski':
        return [
        'Tone: blunt, raw, cynical, but honest.',
        'Use simple, direct language.',
        'No romanticism. No poetic beauty.',
        'Emphasize fatigue, irritation, everyday frustration.',
        'Keep it human and grounded.',
        'No profanity, no shock for the sake of shock.',
        'Ending: a dry, bitter, or ironic punch.',
        ].join('\n');

    case 'remarque':
      return [
        'Quiet lyricism. Clear images. Light sadness, no pathos.',
        'Short sentences. Soft contrasts (light/dark, silence/shout).',
        'Use 1–2 vivid details that make the scene feel alive.',
        'Ending: melancholic, precise, no moralizing.',
      ].join('\n');

    case 'ayn_rand':
      return [
        'Confident, rational tone. Clear statements.',
        'Fewer images, more logic and cause → effect.',
        'No tenderness, no lyricism. Cold clarity.',
        'Ending: a thesis — short and sharp.',
      ].join('\n');

    case 'chekhov':
      return [
        'Observant, simple, human. Subtle irony.',
        'A few everyday details, no “beautifying”.',
        'Calm, conversational sentences — precise.',
        'Ending: a gentle sting or a quiet smile.',
      ].join('\n');

    case 'warm_story':
      return [
        'Warm storytelling — like talking to a friend.',
        'A touch of humor. Gentle tone. Lived-in details.',
        'Make it cozy and human.',
        'Ending: warm, no moral lesson.',
      ].join('\n');

    case 'ironic':
      return [
        'Ironic blogger voice. Light sarcasm, clean punchlines.',
        'Keep it smart and readable. No cruelty.',
        'Short rhythm, clear turns.',
        'Ending: a witty, dry final line.',
      ].join('\n');

    case 'expert':
      return [
        'Concise expert. Clear structure, no fluff.',
        'Short paragraphs. Strong topic sentences.',
        'No motivational tone, no bureaucracy.',
        'Ending: a crisp takeaway.',
      ].join('\n');

    default:
      return 'Neutral rewrite with a clean, readable tone.';
  }
}



async function rewriteText({ text, presetId }) {
  const model = PREMIUM_PRESETS.has(presetId) ? MODEL_PREMIUM : MODEL_FAST;

  const presetText = presetInstruction(presetId);
  const buildMessages = getPromptPack();

  const { sys, user } = buildMessages({
  text,
  presetId,
  presetText,
  });


  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    temperature: 0.9,
    presence_penalty: 0.2,
    frequency_penalty: 0.2,
  });

  return resp?.choices?.[0]?.message?.content?.trim() || '';
}




// -------------------- BOT FLOW --------------------
bot.use(async (ctx, next) => {
  try {
    await upsertUserFromCtx(ctx);
  } catch (e) {
    console.error('upsertUserFromCtx error:', e);
  }
  return next();
});

bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    getSession(userId); // init
    await logEvent({ userId, event: 'start', ok: true });
  }

  await ctx.reply(
    [
      '<b>WOW Advisor</b>',
      '',
      'Drop your draft here.',
      'I’ll rewrite it into a post worth publishing.',
      '',
      'Send the text.',
      'Pick a style.',
      'Get WOW.',
    ].join('\n'),
    { parse_mode: 'HTML' }
  );

  await ctx.reply('<b>Send your draft text now.</b>', { parse_mode: 'HTML' });
});


// Любой текст от пользователя — сохраняем как lastText и показываем пресеты
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const s = getSession(userId);
  const text = ctx.message?.text?.trim() || '';

  // игнорируем команды
  if (text.startsWith('/')) return;

  s.lastText = text;

  await logEvent({
    userId,
    event: 'text_received',
    inputLen: text.length,
    ok: true,
  });

  await ctx.reply(
  '<b>Draft received.</b>\nChoose a style:',
  {
    parse_mode: 'HTML',
    reply_markup: presetsKb().reply_markup,
  }
    );
});

async function requireText(ctx) {
  const userId = ctx.from?.id;
  const s = userId ? getSession(userId) : null;
  if (!s?.lastText) {
    await ctx.answerCbQuery();
    await ctx.reply('Please send a draft first.');
    return null;
  }
  return s;
}

// Выбор пресета
bot.action(/^P:(.+)$/i, async (ctx) => {
  const userId = ctx.from?.id;
  const s = await requireText(ctx);
  if (!s || !userId) return;

  const presetId = ctx.match[1];
  s.lastPreset = presetId;
    const model = PREMIUM_PRESETS.has(presetId) ? MODEL_PREMIUM : MODEL_FAST;
  await ctx.answerCbQuery('Thinking…');

  const inputText = s.lastText;

  try {
    const out = await rewriteText({
      text: inputText,
      presetId,
    });

    if (!out) throw new Error('Empty response from model');

    await logEvent({
      userId,
      event: 'rewrite',
      preset: presetId,
      inputLen: inputText.length,
      outputLen: out.length,
      model,
      ok: true,
    });

    const title = presetTitleById(presetId);

        // подпись
        await ctx.reply(
            `<b>Version: ${escapeHtml(title)}</b>`,
            { parse_mode: 'HTML' }
        );

        const kb = afterResultKb();
        await ctx.reply(`<i>${escapeHtml(out)}</i>`, {
        parse_mode: 'HTML',
        reply_markup: kb.reply_markup,
        });
  } catch (e) {
    console.error('rewrite error:', e);

    await logEvent({
      userId,
      event: 'rewrite',
      preset: presetId,
      inputLen: inputText.length,
      model,
      ok: false,
      errorCode: e?.status ? String(e.status) : null,
      errorMessage: String(e?.message || e),
    });

    await ctx.reply('Something went wrong. Please try again.', afterResultKb());
  }
});

// Действия после результата
bot.action(/^A:(VARIANT|STYLES)$/i, async (ctx) => {
  const userId = ctx.from?.id;
  const s = await requireText(ctx);
  if (!s || !userId) return;

  const action = ctx.match[1];

  if (action === 'STYLES') {
    await ctx.answerCbQuery();
    return ctx.reply(
        'Choose a different style:',
        { reply_markup: presetsKb().reply_markup }
    );
  }


await ctx.answerCbQuery('Thinking…');

try {
  const out = await rewriteText({
    text: s.lastText,
    presetId: s.lastPreset,
    makeShorter: false,
  });

  if (!out) throw new Error('Empty response from model');

  await logEvent({
    userId,
    event: 'rewrite_variant',
    preset: s.lastPreset,
    inputLen: s.lastText.length,
    outputLen: out.length,
    ok: true,
  });

    const title = presetTitleById(s.lastPreset);

    await ctx.reply(
        `<b>Version: ${escapeHtml(title)}</b>`,
        { parse_mode: 'HTML' }
    );

  const kb = afterResultKb();
  await ctx.reply(`<i>${escapeHtml(out)}</i>`, {
    parse_mode: 'HTML',
    reply_markup: kb.reply_markup,
  });
  } catch (e) {
    console.error('action rewrite error:', e);

    await logEvent({
      userId,
      event: action === 'SHORTER' ? 'rewrite_shorter' : 'rewrite_variant',
      preset: s.lastPreset,
      inputLen: s.lastText.length,
      ok: false,
      errorCode: e?.status ? String(e.status) : null,
      errorMessage: String(e?.message || e),
    });

    await ctx.reply('Something went wrong. Please try again.');
  }
});

// Донаты 
bot.action(/^DONATE:(MENU|\d+)$/i, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const arg = ctx.match[1];

  if (arg === 'MENU') {
    await ctx.answerCbQuery();
    await logEvent({ userId, event: 'donate_menu', ok: true });
    return ctx.reply('If this helps, you can support the project:', {
      reply_markup: donateKb().reply_markup,
    });
  }

  const amount = Number(arg);
  await ctx.answerCbQuery();

  if (![10, 20, 50].includes(amount)) {
    return ctx.reply('Please choose one of the available amounts.');
  }

  // логируем клик
  try {
    await logEvent({
  userId,
  event: 'donate_click',
  amount,
  currency: 'XTR',
  ok: true,
    });
  } catch {}

  // отправляем реальный инвойс Stars
  try {
    await sendStarsInvoice(ctx, amount);

    try {
      await logEvent({
  userId,
  event: 'donate_invoice',
  amount,
  currency: 'XTR',
  ok: true,
        });
    } catch {}
  } catch (e) {
    try {
      await logEvent({
        userId,
        event: 'donate_invoice_error',
        ok: false,
        inputLen: null,
        errorCode: null,
        errorMessage: e?.message || String(e),
      });
    } catch {}

    return ctx.reply('Payments are not available right now.');
  }
});



bot.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (e) {
    // optional: log error
  }
});

bot.on('successful_payment', async (ctx) => {
  const userId = ctx.from?.id;
  const sp = ctx.message?.successful_payment;

  const total = sp?.total_amount;       // amount in Stars (XTR)
  const currency = sp?.currency;        // "XTR"
  const payload = sp?.invoice_payload;  // our payload

  if (userId) {
    try {
      await logEvent({
  userId,
  event: 'donate_success',
  amount: sp?.total_amount ?? null,
  currency: sp?.currency ?? null, // "XTR"
  ok: true,
        });
    } catch {}
  }

  await ctx.reply('Thank you for your support.');
});


// -------------------- BOOT --------------------
(async () => {
  await initDb();          // твои таблицы users/user_profiles (профиль потом можно вообще удалить)
  await ensureEventsTable(); // наша статистика
  startHttpServer();

  await bot.launch();
  console.log('🤖 WOW bot is running…');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
