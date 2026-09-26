import {qualityResult} from './models.js';
import {start, text, tableRows} from './common.js';
import {wirePrediction} from './common.js';
start(); let prediction = '';
function render() {
  const form = document.getElementById('manipulation-form');
  const options = Object.fromEntries(['duplicate','missing','activity','minutes','stale'].map(key => [key, form.elements[key].checked]));
  const r = qualityResult(options);
  tableRows('result-rows', r.rows.map(row => [String(row.row),row.event,row.participant || 'Blank',row.activity,String(row.minutes),row.date,row.flags.length ? `HELD · ${row.flags.join('; ')}` : 'ACCEPTED · supplied checks pass']));
  tableRows('rule-rows', r.ruleCounts.map(row => [row.rule,String(row.count)]));
  text('accepted', r.accepted); text('held', r.held); text('reasons', r.reasons);
  text('partition', `4 input rows = ${r.accepted} accepted + ${r.held} held`);
  const notes = [];
  const rowThreeReasons = [options.missing,options.activity,options.minutes].filter(Boolean).length;
  if (rowThreeReasons === 1) notes.push('Row 3 fails one check and enters the held set once. Add another fault to this row: does the number of held rows change?');
  if (rowThreeReasons > 1) notes.push(`Row 3 has ${rowThreeReasons} reasons, but enters the held set once.`);
  if (options.duplicate) notes.push('Rows 1 and 2 now share E-A. Both are held because the event key is ambiguous; choosing the first row would hide the conflict. Repeated participant P-A was already allowed.');
  if (options.stale) notes.push('Row 4 is outside the stated reporting window. This says when the event occurred; delivery timeliness would also need an arrival time and deadline.');
  if (!r.held) notes.push('All supplied checks pass on this toy input. That does not establish real-world truth, population coverage or permission to release a report.');
  if (prediction && options.missing && options.minutes && !options.activity && !options.duplicate && !options.stale) notes.push(`Your prediction was ${prediction} held row(s). Two failures belong to row 3: 2 reasons, 1 held row. The row is the counting unit.`);
  else if (prediction) notes.push('Test the prediction with only “Missing participant” and “Negative minutes” selected. Then combine other faults and explain the new counts.');
  text('feedback', notes.join(' '));
}
wirePrediction(answer => { prediction = answer; render(); }, () => { prediction = ''; render(); });
document.getElementById('manipulation-form').addEventListener('change', render);
render();
