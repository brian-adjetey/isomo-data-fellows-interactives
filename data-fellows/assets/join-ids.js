'use strict';
const $ = id => document.getElementById(id);
const el = (tag, props = {}, text) => { const n = document.createElement(tag); Object.assign(n, props); if (text !== undefined) n.textContent = text; return n; };

const WORKED_ROSTER = [
 {row:1, id:'A', name:'Aline U.'}, {row:2, id:'B', name:'Aline U.'}, {row:3, id:'C', name:'Cedric N.'}];
const WORKED_EVENTS = [
 {ev:'E1', id:'A', name:'Aline U.', minutes:20}, {ev:'E2', id:'A', name:'Aline U.', minutes:15},
 {ev:'E3', id:'B', name:'Aline U.', minutes:10}, {ev:'E4', id:'X', name:'Xavier K.', minutes:5}];
const DUP_B = {row:4, id:'B', name:'Aline U.', dup:true};
const CANVAS_ROSTER = [{row:1, id:'L-101', name:'Aline U.'}, {row:2, id:'L-102', name:'Bosco K.'}, {row:3, id:'L-103', name:'Chantal M.'}];
const CANVAS_EVENTS = [
 {ev:'SUB-1', id:'L-101', name:'Aline U.', pkg:'Engage'}, {ev:'SUB-2', id:'L-101', name:'Aline U.', pkg:'Expand'},
 {ev:'SUB-3', id:'L-102', name:'Bosco K.', pkg:'Engage'}, {ev:'SUB-4', id:'L-104', name:'Diane I.', pkg:'Engage'},
 {ev:'SUB-5', id:'', name:'(blank)', pkg:'Engage'}];

const SCENARIOS = [
 {title:'1 · Left join on learner ID', join:'left', key:'id', roster:WORKED_ROSTER, events:WORKED_EVENTS,
  question:'Keep every roster learner and attach their events, matching on learner ID. Note that A and B share a display name but have different IDs.',
  choiceQ:'What happens to event E4 (learner X)?',
  choices:[['blank','It appears with a blank roster side',false],['drop','It does not appear in the output',true],['error','The join fails with an error',false]],
  mech:'Each roster row produces one output row per matching event, or one blank-side row if it has none. A made two rows because A has two events: that is one-to-many and expected. E4 has no learner in the roster, so it is outside a left join. The output total (45 minutes) is lower than the source (50): an exclusion you must report.'},
 {title:'2 · Inner join on learner ID', join:'inner', key:'id', roster:WORKED_ROSTER, events:WORKED_EVENTS,
  question:'Same tables, but now keep only rows that match on both sides.',
  choiceQ:'Compared with scenario 1, what disappears?',
  choices:[['e4','Nothing: inner and left joins give the same rows here',false],['a','One of A’s two rows, because A is repeated',false],['c','C’s row with no event; E4 is still excluded',true]],
  mech:'An inner join drops unmatched rows on both sides. Learner C vanishes from the output without any error: if you counted learners from this output you would report 2, not 3. Choosing a join is choosing who can silently disappear.'},
 {title:'3 · A duplicated roster key', join:'left', key:'id', roster:[...WORKED_ROSTER, DUP_B], events:WORKED_EVENTS,
  question:'Someone re-registered learner B, so the roster now lists B twice. The roster is supposed to have one row per learner. Left join on learner ID again.',
  choiceQ:'What happens to the total minutes in the output?',
  choices:[['up','It goes up, although no new activity happened',true],['same','It stays at 45, because B has only one event',false],['down','It goes down, because the join drops duplicates',false]],
  mech:'Both B roster rows match E3, so E3 is emitted twice and its 10 minutes are counted twice. The roster broke its own grain. The fix is not to delete a row or add DISTINCT at the end: find out which B record is valid, with the owner, and state the uniqueness rule as a check.'},
 {title:'4 · Matching on display name', join:'left', key:'name', roster:WORKED_ROSTER, events:WORKED_EVENTS,
  question:'An export arrives without learner IDs, so an agent proposes matching on display name instead. A and B are different learners who share the name “Aline U.”. IDs remain visible here so you can detect false matches; this join uses only the names.',
  choiceQ:'Which events are now attached to learner A?',
  choices:[['two','E1 and E2 only, as with the ID match',false],['none','None, because the name is ambiguous',false],['all3','E1, E2 and E3, including B’s event',true]],
  mech:'The join cannot know that two learners share a name. Every “Aline U.” roster row matches every “Aline U.” event: 2 roster rows × 3 events = 6 connections, and 3 of them are false. Nothing errors and the output looks plausible. This is why stable IDs matter, and why a name match is a candidate for review, never an identity.'},
 {title:'5 · Isomo transfer: a Canvas export and the learner master', join:'left', key:'id', roster:CANVAS_ROSTER, events:CANVAS_EVENTS, canvas:true,
  question:'The learner master for one school has three learners. The weekly Canvas export has one row per submission. The weekly form asks: what share of this school’s learners submitted the Engage package? Left join the master to the export on learner ID.',
  choiceQ:'What should the report say?',
  choices:[['rows','3 of 4 output rows have an Engage submission (75%)',false],['export','4 of 5 export rows are Engage submissions (80%)',false],['guess','3 of 3 learners (100%), reading L-104 as a typo for L-103',false],['ok','2 of 3 learners (67%), with 2 export rows held for the owner',true]],
  mech:'The denominator is learners on the master (3), not rows in any table. L-101 appears twice because of two submissions: a legitimate one-to-many match. SUB-4 (L-104, not on this master: a transfer? a typo? another school?) and SUB-5 (blank ID) cannot be counted or attached by guessing. Report 2 of 3 and list the held rows with the decision needed.'}
];

let index = 0, revealed = false, done = false;

function doJoin(roster, events, kind, key) {
 const rows = [], matched = new Set(), unmatchedRoster = [], matrix = roster.map(() => events.map(() => false));
 roster.forEach((r, i) => {
  const hits = events.map((e, j) => ({e, j})).filter(({e}) => r[key] && e[key] && r[key] === e[key]);
  hits.forEach(({j}) => { matrix[i][j] = true; matched.add(j); });
  if (!hits.length) { unmatchedRoster.push(i); if (kind === 'left') rows.push({r:i, e:null}); }
  hits.forEach(({j}) => rows.push({r:i, e:j, mult:hits.length}));
 });
 const unmatchedEvents = events.map((e, j) => j).filter(j => !matched.has(j));
 if (kind === 'right') unmatchedEvents.forEach(j => rows.push({r:null, e:j}));
 return {rows, matrix, unmatchedRoster, unmatchedEvents};
}

function table(caption, headers, body, rowClass) {
 const t = el('table'); t.append(el('caption', {}, caption));
 const h = el('tr'); headers.forEach(x => h.append(el('th', {scope:'col'}, x))); t.append(el('thead')); t.tHead.append(h);
 const b = el('tbody'); body.forEach((cells, i) => { const tr = el('tr'); const c = rowClass && rowClass(i); if (c) tr.className = c; cells.forEach(v => tr.append(el('td', {}, v === null ? 'No match' : String(v)))); b.append(tr); }); t.append(b); return t;
}

function renderInputs(sc) {
 $('roster').replaceChildren(table(sc.canvas ? 'Learner master: one row per learner' : 'Roster: one row per learner (intended)', ['Row', 'Learner ID', 'Display name'],
  sc.roster.map(r => [r.row, r.id, r.name + (r.dup ? ' (re-registered)' : '')]), i => sc.roster[i].dup ? 'dup' : ''));
 $('events').replaceChildren(table(sc.canvas ? 'Canvas export: one row per submission' : 'Events: one row per event', sc.canvas ? ['Submission', 'Learner ID', 'Name as typed', 'Package'] : ['Event', 'Learner ID', 'Name as typed', 'Minutes'],
  sc.events.map(e => [e.ev, e.id || '(blank)', e.name, sc.canvas ? e.pkg : e.minutes])));
}

function renderResult(sc, res, target) {
 const minutes = rows => rows.reduce((s, x) => s + (x.e !== null && sc.events[x.e].minutes || 0), 0);
 const learners = new Set(res.rows.filter(x => x.r !== null).map(x => sc.roster[x.r].id));
 const statBox = (label, value, warn) => { const d = el('div', {className:'stat' + (warn ? ' warn' : '')}); d.append(el('b', {}, String(value)), document.createTextNode(label)); return d; };
 const stats = [statBox('output rows', res.rows.length), statBox('different roster learner IDs in output', learners.size),
  statBox('roster rows with no match', res.unmatchedRoster.length, res.unmatchedRoster.length > 0),
  statBox(sc.canvas ? 'export rows with no roster learner' : 'events with no roster learner', res.unmatchedEvents.length, res.unmatchedEvents.length > 0)];
 if (!sc.canvas) { const src = sc.events.reduce((s, e) => s + e.minutes, 0), out = minutes(res.rows); stats.push(statBox(`output minutes (source total ${src})`, out, out !== src)); }
 else { const eng = new Set(res.rows.filter(x => x.e !== null && sc.events[x.e].pkg === 'Engage').map(x => sc.roster[x.r].id)); stats.push(statBox('master learners with an Engage submission', `${eng.size} of ${sc.roster.length}`)); }
 target.stats.replaceChildren(...stats);
 // Match map: rows are roster rows, columns are events.
 const m = el('table', {className:'matrix'}); m.append(el('caption', {}, 'Match map: each ✓ becomes one output row'));
 const hr = el('tr'); hr.append(el('th', {scope:'col'}, 'Roster row ↓ / event →')); sc.events.forEach(e => hr.append(el('th', {scope:'col'}, e.ev + ' (' + (e.id || 'blank') + ')'))); m.append(hr);
 sc.roster.forEach((r, i) => { const tr = el('tr'); tr.append(el('th', {scope:'row'}, `Row ${r.row}: ${r.id}`)); sc.events.forEach((e, j) => { const td = el('td', {className: res.matrix[i][j] ? 'match' : ''}, res.matrix[i][j] ? '✓ match' : '·'); tr.append(td); }); m.append(tr); });
 target.matrix.replaceChildren(m);
 const headers = ['Output row', 'From roster row', 'Learner ID', sc.canvas ? 'Submission' : 'Event', sc.canvas ? 'Package' : 'Minutes', 'Why this row exists'];
 const body = res.rows.map((x, k) => { const r = x.r === null ? null : sc.roster[x.r], e = x.e === null ? null : sc.events[x.e];
  const why = !e ? 'Roster row kept with no match' : !r ? 'Event kept with no roster learner' : (x.mult > 1 ? `Roster row ${r.row} matched ${x.mult} rows` : 'One match') + (r.dup ? ': duplicate roster row' : '') + (r.id !== e.id ? ': FALSE MATCH: different IDs' : '');
  return [k + 1, r ? r.row : null, r ? r.id : null, e ? e.ev : null, e ? (sc.canvas ? e.pkg : e.minutes) : null, why]; });
 target.output.replaceChildren(table('Output: trace every row to its sources', headers, body, k => { const x = res.rows[k]; return x.r !== null && sc.roster[x.r].dup ? 'dup' : (x.e === null || x.r === null ? 'nomatch' : ''); }));
 if (target.tray) {
  const tray = target.tray; tray.replaceChildren(el('h3', {}, 'Unmatched rows: account for both sides'));
  const lost = [];
  res.unmatchedRoster.forEach(i => { if (sc.join === 'inner') lost.push(`Roster row ${sc.roster[i].row} (${sc.roster[i].id}) has no match and was dropped by the inner join.`); else lost.push(`Roster row ${sc.roster[i].row} (${sc.roster[i].id}) has no match; it is in the output with a blank side.`); });
  res.unmatchedEvents.forEach(j => { const e = sc.events[j]; lost.push(`${e.ev} (learner ID ${e.id || 'blank'}) matches no roster learner and is not in a ${sc.join} join output.`); });
  if (!lost.length) lost.push('Every row on both sides matched.');
  const ul = el('ul'); lost.forEach(t => ul.append(el('li', {}, t))); tray.append(ul);
 }
 return {rows:res.rows.length};
}

function loadScenario() {
 const sc = SCENARIOS[index]; revealed = false;
 $('sc-title').textContent = 'Scenario ' + sc.title;
 $('sc-progress').textContent = `Scenario ${index + 1} of ${SCENARIOS.length}`;
 $('sc-question').textContent = sc.question;
 renderInputs(sc);
 $('pred-rows').value = ''; $('pred-rows').disabled = false; $('reveal').disabled = false; $('pred-msg').textContent = '';
 $('pred-choice-q').firstChild.textContent = sc.choiceQ;
 const box = $('pred-choice'); box.replaceChildren();
 sc.choices.forEach(([v, t]) => { const l = el('label'); l.append(el('input', {type:'radio', name:'choice', value:v}), document.createTextNode(t)); box.append(l); });
 $('outcome').hidden = true;
 $('next').textContent = index === SCENARIOS.length - 1 ? 'Finish and open free practice' : 'Next scenario';
}

$('reveal').addEventListener('click', () => {
 const sc = SCENARIOS[index]; const v = $('pred-rows').value; const pick = document.querySelector('input[name=choice]:checked');
 if (v === '' || !Number.isInteger(Number(v)) || Number(v) < 0 || !pick) { $('pred-msg').textContent = 'Make both predictions first: a whole number of rows and one answer to the question.'; return; }
 $('pred-msg').textContent = '';
 const res = doJoin(sc.roster, sc.events, sc.join, sc.key);
 renderResult(sc, res, {stats:$('stats'), matrix:$('matrix'), output:$('output'), tray:$('tray')});
 const actual = res.rows.length, guess = Number(v); const choice = sc.choices.find(c => c[0] === pick.value);
 const correctChoice = sc.choices.find(c => c[2]);
 $('result').textContent = `You predicted ${guess} row${guess === 1 ? '' : 's'}; the join produced ${actual}. ` + (guess === actual ? 'Your row prediction matched. ' : 'Before moving on, use the match map to find the row(s) you did not expect. ') +
  (choice[2] ? 'Your answer to the question was right: ' + choice[1] + '.' : 'Your answer to the question was not right. The answer: ' + correctChoice[1] + '.');
 $('mechanism').textContent = 'Mechanism: ' + sc.mech;
 $('outcome').hidden = false; revealed = true;
 $('pred-rows').disabled = true; $('reveal').disabled = true; document.querySelectorAll('input[name=choice]').forEach(x => { x.disabled = true; });
});

$('next').addEventListener('click', () => {
 if (index < SCENARIOS.length - 1) { index++; loadScenario(); $('sc-title').focus?.(); }
 else { done = true; $('free').disabled = false; $('next').disabled = true; $('free-result').textContent = 'Free practice opened. Set the controls, predict, then reveal.'; }
});

function freeChanged() { $('free-output').replaceChildren(); $('free-result').textContent = 'Condition changed: predict the new row count, then reveal.'; $('free-pred').value = ''; }
['join', 'key', 'duplicate'].forEach(id => $(id).addEventListener('change', freeChanged));
$('free-reveal').addEventListener('click', () => {
 const v = $('free-pred').value;
 if (v === '' || !Number.isInteger(Number(v)) || Number(v) < 0) { $('free-result').textContent = 'Enter a whole-number prediction first.'; return; }
 const roster = $('duplicate').checked ? [...WORKED_ROSTER, DUP_B] : WORKED_ROSTER;
 const sc = {roster, events:WORKED_EVENTS, join:$('join').value};
 const res = doJoin(roster, WORKED_EVENTS, $('join').value, $('key').value === 'id' ? 'id' : 'name');
 const holder = {stats:el('div', {className:'stats'}), matrix:el('div'), output:el('div')};
 renderResult(sc, res, holder);
 $('free-output').replaceChildren(holder.stats, holder.matrix, holder.output);
 $('free-result').textContent = `${res.rows.length} output rows (you predicted ${v}). ${res.unmatchedRoster.length} roster row(s) had no match; ${res.unmatchedEvents.length} event(s) had no roster match.` + (Number(v) === res.rows.length ? ' Prediction matched.' : ' Find the difference in the match map before changing another control.');
});
$('reset').addEventListener('click', () => location.reload());
$('sc-title').tabIndex = -1;
loadScenario();
