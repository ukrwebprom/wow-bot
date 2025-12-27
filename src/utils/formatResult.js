function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatResultHtml(result) {
  const strengths = Array.isArray(result?.strengths) ? result.strengths : [];
  const issues = Array.isArray(result?.issues) ? result.issues : [];
  const recs = Array.isArray(result?.recommendations) ? result.recommendations : [];
  const meta = result?.meta ?? {};

  const lines = [];
  lines.push(`✅ <b>Analysis</b>`);

  lines.push(`\n<b>Strengths:</b>`);
  lines.push(strengths.length ? strengths.map(x => `• ${escapeHtml(x)}`).join('\n') : '• (none)');

  lines.push(`\n<b>Issues:</b>`);
  lines.push(issues.length ? issues.map(x => `• ${escapeHtml(x)}`).join('\n') : '• (none)');

  lines.push(`\n<b>Recommendations:</b>`);
  lines.push(recs.length ? recs.map(x => `• ${escapeHtml(x)}`).join('\n') : '• (none)');

  const metaPairs = [];
  if (meta.length != null) metaPairs.push(`length=${meta.length}`);
  if (meta.has_image != null) metaPairs.push(`hasImage=${meta.has_image}`); // без underscore
  if (meta.platform) metaPairs.push(`platform=${meta.platform}`);
  if (meta.goal) metaPairs.push(`goal=${meta.goal}`);
  if (meta.voice) metaPairs.push(`voice=${meta.voice}`);
  if (meta.niche) metaPairs.push(`niche=${meta.niche}`);

  if (metaPairs.length) {
    lines.push(`\n<i>(${escapeHtml(metaPairs.join(', '))})</i>`);
  }

  return lines.join('\n');
}
