import { MESSAGES } from './messages.js';

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function t(key, lang = 'EN', vars = {}) {
  const node = getByPath(MESSAGES, key);

  // node должен быть объектом вида {RU,UA,EN}
  if (!node || typeof node !== 'object') return key;

  const text = node[lang] ?? node.EN ?? node.RU ?? '';
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}
