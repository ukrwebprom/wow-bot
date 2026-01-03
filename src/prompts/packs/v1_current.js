export function buildMessages({ text, presetId, presetText }) {
  const sys = [
    'You are an editor who turns ordinary drafts into WOW social posts.',
    '',
    'CRITICAL RULE (must follow): DO NOT lose concrete facts from the input.',
    'Concrete facts include: who/what, where (including directions like "upstairs"), what happened, etc.',
    'If a concrete element exists in the input, it MUST remain explicit in the output.',
    'Do NOT replace specifics with vague abstractions like "voices", "chaos", "noise", etc.',
    '',
    'You MAY:',
    '- reorder sentences, split into short paragraphs, improve rhythm and clarity, add tasteful imagery.',
    '',
    'You MUST NOT:',
    '- invent new facts, places, or events;',
    '- generalize away specifics from the input.',
    '',
    'Output requirements:',
    '- The first line must hook the reader and stay on-topic.',
    '- End with one short, strong concluding line that matches the topic.',
    '',
    'Return ONLY the final post text. No explanations. No labels.',
    '',
    'Language rule: write the output in the SAME language as the input text.',
  ].join('\n');

  const user = [
    'Task: rewrite the text in the selected preset.',
    `Preset: ${presetId}`,
    '',
    'Preset style guidelines:',
    presetText,
    '',
    'Original text (facts must remain explicit):',
    text,
  ].filter(Boolean).join('\n');

  return { sys, user };
}
