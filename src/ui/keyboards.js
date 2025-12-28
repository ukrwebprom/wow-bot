import { Markup } from 'telegraf';
import { ACTIONS } from '../constants/actions.js';

export const mainMenuKb = Markup.inlineKeyboard([
  [
    Markup.button.callback('🧠 Analyze', ACTIONS.ANALYZE),
    Markup.button.callback('👤 Profile', ACTIONS.PROFILE),
  ],
]);

export const profileCompleteKb = Markup.inlineKeyboard([
  [Markup.button.callback('✏️ Edit Profile', ACTIONS.PROFILE_EDIT)],
  [Markup.button.callback('⬅️ Back', ACTIONS.BACK)],
]);

export const profileEmptyKb = Markup.inlineKeyboard([
  [Markup.button.callback('📝 Enter profile data', ACTIONS.PROFILE_ENTER)],
  [Markup.button.callback('⬅️ Back', ACTIONS.BACK)],
]);

export const cancelKb = Markup.inlineKeyboard([
  [Markup.button.callback('❌ Cancel', ACTIONS.CANCEL)],
]);

export const wizardCancelKb = Markup.inlineKeyboard([
  [Markup.button.callback('✖️ Exit', 'P_EXIT')],
]);

// --- WIZARD KEYS (генераторы клавиатур) ---

export function languageKb(current) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(markSelected('RU', current === 'RU'), 'P_LANG:RU'),
      Markup.button.callback(markSelected('UA', current === 'UA'), 'P_LANG:UA'),
      Markup.button.callback(markSelected('EN', current === 'EN'), 'P_LANG:EN'),
    ],
    [Markup.button.callback('✖️ Exit', 'P_EXIT')],
  ]);
}

export function platformKb(current) {
  const items = [
    'Threads',
    'X',
    'Instagram',
    'LinkedIn',
    'Facebook',
    'Auto',
  ];
  return Markup.inlineKeyboard([
    ...chunk(items.map((v) =>
      Markup.button.callback(markSelected(v, current === v), `P_PLATFORM:${v}`)
    ), 2),
    [Markup.button.callback('⬅️ Back', 'P_BACK:LANG')],
    [Markup.button.callback('✖️ Exit', 'P_EXIT')],
  ]);
}

export function goalKb(current) {
  const items = [
    'Reach',
    'Replies',
    'Follows',
    'Leads/Sales',
    'Authority',
    'Community',
  ];
  return Markup.inlineKeyboard([
    ...chunk(items.map((v) =>
      Markup.button.callback(markSelected(v, current === v), `P_GOAL:${encode(v)}`)
    ), 2),
    [Markup.button.callback('⬅️ Back', 'P_BACK:PLATFORM')],
    [Markup.button.callback('✖️ Exit', 'P_EXIT')],
  ]);
}

export function voiceKb(current) {
  const items = [
    'Calm & smart',
    'Bold & provocative',
    'Friendly & warm',
    'Dry & business',
    'Irony / humor',
    'Storyteller',
    'Minimal',
  ];
  return Markup.inlineKeyboard([
    ...chunk(items.map((v) =>
      Markup.button.callback(markSelected(v, current === v), `P_VOICE:${encode(v)}`)
    ), 2),
    [Markup.button.callback('⬅️ Back', 'P_BACK:GOAL')],
    [Markup.button.callback('✖️ Exit', 'P_EXIT')],
  ]);
}

export function nicheKb(current) {
  const items = [
    'Design / Branding',
    'Marketing / SMM',
    'Business / Product',
    'Tech / AI',
    'Personal / Lifestyle',
    'Education / How-to',
    'Mixed / Auto',
  ];
  return Markup.inlineKeyboard([
    ...chunk(items.map((v) =>
      Markup.button.callback(markSelected(v, current === v), `P_NICHE:${encode(v)}`)
    ), 2),
    [Markup.button.callback('⬅️ Back', 'P_BACK:VOICE')],
    [Markup.button.callback('✖️ Exit', 'P_EXIT')],
  ]);
}

// Boundaries — мультиселект (toggle)
const BOUNDARIES = [
  { id: 'NoToxicity', label: 'No toxicity' },
  { id: 'NoPolitics',  label: 'No politics' },
  { id: 'NoProfanity', label: 'No profanity' },
  { id: 'NoClickbait', label: 'No clickbait' },
  { id: 'NoHashtags',  label: 'No hashtags' },
  { id: 'LessEmojis',  label: 'Less emojis' },
  { id: 'NoRewrite',   label: "Don't rewrite, only advise" },
];

export function boundariesKb(selectedIds = []) {
  const selected = new Set(selectedIds);
  const buttons = BOUNDARIES.map((b) => {
    const on = selected.has(b.id);
    const text = (on ? '✅ ' : '') + b.label;
    return Markup.button.callback(text, `P_BOUND:${b.id}`);
  });

  return Markup.inlineKeyboard([
    ...chunk(buttons, 2),
    [Markup.button.callback('✅ Done', 'P_BOUND_DONE')],
    [Markup.button.callback('⬅️ Back', 'P_BACK:NICHE')],
    [Markup.button.callback('✖️ Exit', 'P_EXIT')],
  ]);
}

// --- helpers ---
function markSelected(text, isOn) {
  return isOn ? `✅ ${text}` : text;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// callback_data лучше держать коротким и без пробелов
function encode(s) {
  return s.replaceAll(' ', '_');
}

export const languageSelectKb = Markup.inlineKeyboard([
  [
    Markup.button.callback('🇺🇦 Українська', 'SET_LANG:UA'),
    Markup.button.callback('🇷🇺 Русский', 'SET_LANG:RU'),
    Markup.button.callback('🇬🇧 English', 'SET_LANG:EN'),
  ],
]);