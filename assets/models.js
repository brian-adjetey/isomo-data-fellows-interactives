// Independent toy cases. No operational data, inferred people or assessment keys.
export const missingCases = {
  first: [12, 0, null, 8],
  changed: [0, null, null, 15],
};
export function missingResult(caseName, policy, dropZero) {
  const raw = missingCases[caseName].map((minutes, i) => ({id: `M-${i + 1}`, minutes}));
  const rows = raw.map(row => {
    let value = row.minutes, note = 'Kept as received', held = false;
    if (value === null && policy === 'zero') { value = 0; note = 'Unknown replaced with 0'; }
    if (value === null && policy === 'drop') { held = true; note = 'Blank row removed from working output'; }
    if (!held && dropZero && value === 0) { held = true; note += '; zero row removed'; }
    return {...row, value, note, held};
  });
  const kept = rows.filter(row => !row.held);
  const numeric = kept.filter(row => row.value !== null);
  return {raw, rows, kept, numeric: numeric.length, missing: kept.length - numeric.length,
    sum: numeric.reduce((n, row) => n + row.value, 0), held: rows.length - kept.length,
    sourceNumeric: raw.filter(row => row.minutes !== null).length};
}

export const qualityBase = [
  {row: 1, event: 'E-A', participant: 'P-A', activity: 'reading', minutes: 10, date: '2026-01-05'},
  {row: 2, event: 'E-B', participant: 'P-A', activity: 'typing', minutes: 0, date: '2026-01-06'},
  {row: 3, event: 'E-C', participant: 'P-B', activity: 'reading', minutes: 20, date: '2026-01-07'},
  {row: 4, event: 'E-D', participant: 'P-C', activity: 'typing', minutes: 60, date: '2026-01-11'},
];
export const qualityRules = ['Required labels', 'Allowed activity', 'Whole minutes 0–60', 'Reporting window', 'Repeated event ID'];
export function qualityResult(options) {
  const rows = qualityBase.map(row => ({...row}));
  if (options.duplicate) rows[1].event = rows[0].event;
  if (options.missing) rows[2].participant = '';
  if (options.activity) rows[2].activity = 'writing';
  if (options.minutes) rows[2].minutes = -5;
  if (options.stale) rows[3].date = '2026-01-04';
  const flagged = rows.map(row => {
    const flags = [];
    if (!row.event.trim() || !row.participant.trim()) flags.push(qualityRules[0]);
    if (!['reading', 'typing'].includes(row.activity)) flags.push(qualityRules[1]);
    if (!Number.isInteger(row.minutes) || row.minutes < 0 || row.minutes > 60) flags.push(qualityRules[2]);
    if (row.date < '2026-01-05' || row.date > '2026-01-11') flags.push(qualityRules[3]);
    if (rows.filter(other => other.event === row.event).length > 1) flags.push(qualityRules[4]);
    return {...row, flags};
  });
  const held = flagged.filter(row => row.flags.length);
  return {rows: flagged, held: held.length, accepted: rows.length - held.length,
    reasons: flagged.reduce((n, row) => n + row.flags.length, 0),
    ruleCounts: qualityRules.map(rule => ({rule, count: flagged.filter(row => row.flags.includes(rule)).length}))};
}
