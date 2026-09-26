import {missingResult} from './models.js';
import {start, text, tableRows, wirePrediction} from './common.js';
start();
let prediction = '';
const label = value => value === null ? 'Blank · unknown' : String(value);
function render() {
  const data = new FormData(document.getElementById('manipulation-form'));
  const scenario = data.get('case') || 'first', policy = data.get('policy') || 'keep';
  const zero = data.get('drop-zero') === 'on';
  const r = missingResult(scenario, policy, zero);
  tableRows('raw-rows', r.raw.map(row => [row.id, label(row.minutes)]));
  tableRows('working-rows', r.rows.map(row => [row.id, row.held ? 'Removed' : label(row.value), row.note]));
  text('partition', `${r.raw.length} received = ${r.kept.length} retained + ${r.held} removed`);
  text('numeric', r.numeric); text('missing', r.missing); text('sum', r.sum);
  text('source-count', `RAW has ${r.sourceNumeric} recorded numeric values and ${r.raw.length - r.sourceNumeric} unknown duration(s). It never changes when you change a working-copy rule.`);
  let explanation = policy === 'zero'
    ? `A blank has been assigned a number without new measurement. The working copy now has ${r.numeric} numeric cells; that does not establish ${r.numeric} measured durations.`
    : policy === 'drop'
      ? 'Removing blank rows changes which events remain. The visible sum cannot reveal that exclusion: an unknown value contributed no number before removal either.'
      : 'Keeping blanks preserves what is unknown. Adding the recorded numbers gives a known subtotal, not a complete total for all events.';
  if (zero) explanation += ' You also removed zero-valued rows after the blank rule. A recorded zero was a measurement; dropping it removes an event even though the sum is unchanged.';
  if (prediction) {
    explanation += policy === 'zero' && !zero
      ? ` Your first prediction was “${prediction} numeric cells.” The count increased from ${r.sourceNumeric} to ${r.numeric}, while the known subtotal stayed ${r.sum}. The fill changed meaning, not evidence.`
      : ' To test the original prediction directly, choose “Replace blank with 0” and keep zero rows. Other settings answer different questions.';
  }
  text('feedback', explanation);
}
wirePrediction(answer => { prediction = answer; render(); }, () => { prediction = ''; render(); });
document.getElementById('manipulation-form').addEventListener('change', render);
render();
