function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function stripLabel(line, labels) {
  const s = String(line || '').trim();
  for (const lbl of labels) {
    const re = new RegExp(`^(?:[•\\-*]\\s*)?(?:\\(\\d+\\)\\s*)?${lbl}\\s*:\\s*`, 'i');
    if (re.test(s)) return s.replace(re, '').trim();
  }
  return s;
}

function pickByPrefix(lines, prefixes) {
  const picked = [];
  const rest = [];

  for (const line of lines) {
    const s = String(line || '').trim();

    // допускаем ведущие маркеры: •, -, *, и нумерацию (1)
    const hit = prefixes.some((p) => {
      const re = new RegExp(`^(?:[•\\-*]\\s*)?(?:\\(\\d+\\)\\s*)?${p}\\s*:`, 'i');
      return re.test(s);
    });

    (hit ? picked : rest).push(s);
  }

  return { picked, rest };
}

export function formatResultHtml(result) {
  const strengths = asArray(result?.strengths);
  const issues = asArray(result?.issues);
  const recs0 = asArray(result?.recommendations).filter(Boolean);
  const meta = result?.meta ?? {};

  // 1) разложим recommendations по секциям
  const { picked: hooksRaw, rest: recs1 } = pickByPrefix(recs0, ['HOOK']);
  const { picked: rewritesRaw, rest: recs2 } = pickByPrefix(recs1, ['REWRITE']);
  const { picked: ctaRaw, rest: recs3 } = pickByPrefix(recs2, ['CTA']);
  const { picked: fixesRaw, rest: otherRaw } = pickByPrefix(recs3, ['FIX']);

  const hooks = hooksRaw.map((x) => stripLabel(x, ['HOOK']));
  const rewrites = rewritesRaw.map((x) => stripLabel(x, ['REWRITE']));
  const ctas = ctaRaw.map((x) => stripLabel(x, ['CTA']));
  const fixes = fixesRaw.map((x) => stripLabel(x, ['FIX']));
  const other = otherRaw; // уже без label, потому что это "прочее"

  const lines = [];
  lines.push(`✅ <b>Analysis</b>`);

  // Strengths
  lines.push(`\n<b>Strengths</b>`);
  lines.push(strengths.length
    ? strengths.map((x) => `• ${escapeHtml(x)}`).join('\n')
    : '• (none)'
  );

  // Issues
  lines.push(`\n<b>Issues</b>`);
  lines.push(issues.length
    ? issues.map((x) => `• ${escapeHtml(x)}`).join('\n')
    : '• (none)'
  );

  // Recommendations — но секциями
  lines.push(`\n<b>Recommendations</b>`);

  if (hooks.length) {
    lines.push(`\n<b>Hooks</b>`);
    lines.push(hooks.map((x) => `• ${escapeHtml(x)}`).join('\n'));
  }

  if (rewrites.length) {
    lines.push(`\n<b>Rewrites</b>`);
    // делаем блоки, чтобы можно было копипастить
    lines.push(
      rewrites
        .map((x) => `<pre>${escapeHtml(x)}</pre>`)
        .join('\n')
    );
  }

  if (ctas.length) {
    lines.push(`\n<b>CTA</b>`);
    lines.push(ctas.map((x) => `• ${escapeHtml(x)}`).join('\n'));
  }

  if (fixes.length) {
    lines.push(`\n<b>Fixes</b>`);
    lines.push(fixes.map((x) => `• ${escapeHtml(x)}`).join('\n'));
  }

  if (other.length) {
    lines.push(`\n<b>Other</b>`);
    lines.push(other.map((x) => `• ${escapeHtml(x)}`).join('\n'));
  }

  // meta (аккуратно, без underscore)
  const metaPairs = [];
  if (meta.length != null) metaPairs.push(`length=${meta.length}`);
  if (meta.has_image != null) metaPairs.push(`hasImage=${meta.has_image}`);
  if (meta.platform) metaPairs.push(`platform=${meta.platform}`);
  if (meta.goal) metaPairs.push(`goal=${meta.goal}`);
  if (meta.voice) metaPairs.push(`voice=${meta.voice}`);
  if (meta.niche) metaPairs.push(`niche=${meta.niche}`);

  if (metaPairs.length) {
    lines.push(`\n<i>(${escapeHtml(metaPairs.join(', '))})</i>`);
  }

  return lines.join('\n');
}
