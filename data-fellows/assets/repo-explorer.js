'use strict';
const $ = id => document.getElementById(id);
const el = (tag, props = {}, text) => { const n = document.createElement(tag); Object.assign(n, props); if (text !== undefined) n.textContent = text; return n; };

// Excerpts mirror fixtures/synthetic/ai_native_v1/training_repo exactly enough to be recognisable.
const FILES = [
 {path:'README.md', zone:'instructions', label:'Instructions', change:false,
  role:'Purpose, map and the exact safe commands. Read before any command.',
  text:'# Training repository: synthetic events only\n...It has no network, production configuration or genuine learner records.\nFolder access does not authorize a live task.\n\npython -m unittest discover -s tests -v\npython src/workflow.py --input data/good.csv --output runs/good-01',
  git:'Tracked by Git.'},
 {path:'AGENTS.md', zone:'instructions', label:'Instructions', change:false,
  role:'The agent’s boundary. Ask the agent to read it and state the task limits before proposing a plan.',
  text:'Default to read-only inspection until the instructor approves the narrow task.\nPreserve data/ byte-for-byte. Do not install packages, use the network,\nupload, delete prior output, change permissions, fabricate identifiers\nor weaken checks. Preserve unrelated changes.',
  git:'Tracked by Git.'},
 {path:'docs/runbook.md', zone:'instructions', label:'Instructions', change:false,
  role:'How to operate the workflow: the contract, checks, failure behavior and when to stop.',
  text:'One row is an event. ... Repeated participant IDs across events are allowed.\nAny held row or empty input yields BLOCKED and exit 2.\nInvalid input is not repaired by rerunning. ... Never guess a missing identity.',
  git:'Tracked by Git.'},
 {path:'data/good.csv', zone:'source', label:'Source evidence', change:false,
  role:'Synthetic source rows. Evidence to preserve, not a draft to tidy.',
  text:'event_id,participant_id,session,minutes\nE01,R01,S1,20\nE02,R02,S1,0\nE03,R01,S2,15\nE04,R03,S2,10',
  git:'Tracked. Any change here would appear in git status as  M data/good.csv.'},
 {path:'data/missing.csv', zone:'source', label:'Source evidence', change:false,
  role:'The same events with one participant ID left blank. The blank is the evidence; filling it would invent an identity.',
  text:'event_id,participant_id,session,minutes\nE01,R01,S1,20\nE02,R02,S1,0\nE03,,S2,15\nE04,R03,S2,10',
  git:'Tracked by Git.'},
 {path:'src/workflow.py', zone:'implementation', label:'Implementation', change:false,
  role:'Reads the source, validates rows, writes a new run folder. Changing it changes what the workflow accepts.',
  text:"reasons = row_errors(row, counts)\nif reasons:\n    held.append(dict(row, reasons='; '.join(reasons)))\nelse:\n    accepted.append(row)\n...\n'state': 'BLOCKED' if held or not rows else 'VALIDATED_TRAINING_ONLY',",
  git:'Tracked by Git.'},
 {path:'tests/test_workflow.py', zone:'checks', label:'Checks', change:false,
  role:'Executable checks of specific behaviors. They prove those behaviors, not that the data is true.',
  text:"def test_missing_stays_visible_and_blocks_curated(self):\n    ...\n    self.assertEqual(result['state'], 'BLOCKED')\n    self.assertFalse((out / 'curated.csv').exists())",
  git:'Tracked by Git.'},
 {path:'docs/report.md', zone:'communication', label:'Communication', change:true,
  role:'The heading shown at the top of every generated report. This is the seeded defect your task fixes.',
  text:'# Learners this run\n\nTeaching label defect: the heading above is intentionally wrong for event rows.',
  git:'Tracked. After the fix, git status shows  M docs/report.md.'},
 {path:'runs/good-01/', zone:'derived', label:'Derived output', change:false,
  role:'Output from an earlier run: accepted.csv, held.csv, status.json, report.html. New runs go in new folders; earlier evidence stays.',
  text:'accepted.csv  held.csv  status.json  report.html  curated.csv',
  git:'Ignored by Git (.gitignore: runs/). It never appears in git status or git diff: open it directly to inspect it.'}
];
const WHY_NOT = {
 instructions:'Instructions tell you the task’s limits; the fix does not require changing them.',
 source:'Source data is evidence. A wording fix never authorizes changing it, even to make it "agree" with the heading.',
 implementation:'Code controls behavior. The task changes wording, not what the workflow accepts.',
 checks:'Tests encode the rules. Changing them to fit a change hides whether the rule still holds.',
 derived:'Earlier outputs are evidence of earlier runs. A new run goes in a new folder.'
};

const ACTIONS = [
 ['Read README.md, AGENTS.md and docs/runbook.md','allowed','Reading changes nothing and is how you learn the limits. Always first.'],
 ['Run the documented tests: python -m unittest discover -s tests -v','allowed','A documented check that preserves source and implementation files. It creates temporary test output; Python may also create cache files.'],
 ['Edit line 1 of docs/report.md','approval','This is the task, but it is still a write. It happens after a reviewer approves the plan.'],
 ['Run the workflow into a new folder runs/good-02','approval','Documented and safe, but it writes new files. Do it inside the approved plan so the output is expected.'],
 ['Commit the heading change with git commit','approval','A commit records a decision in history. Ask the reviewer; the diff should be reviewed first.'],
 ['Fill the blank participant_id in data/missing.csv with R99 so the run passes','stop','This invents an identity and changes source evidence. Only the source owner can supply a real ID.'],
 ['Edit the test so a held row no longer blocks the run','stop','That weakens the check to produce a green result. The rule would silently change.'],
 ['Delete runs/good-01 so the same folder name can be reused','stop','Earlier output is evidence. The runbook says use a new folder; never delete prior runs.'],
 ['pip install pandas because the agent prefers it','stop','AGENTS.md forbids installing packages. New dependencies are a separate decision.'],
 ['Upload report.html to a public link so the supervisor can see it','stop','Publishing is an external action. Reports go through an approved, access-controlled route.'],
 ['Run git reset --hard to tidy the workspace','stop','This discards uncommitted work, possibly someone else’s, and destroys the evidence you need to review.']
];
const SORT_LABEL = {allowed:'Allowed now (read-only)', approval:'Only inside an approved plan', stop:'Stop: not part of this task'};

const PLAN = [
 ['Read README.md, AGENTS.md and docs/runbook.md to confirm scope.','accept','Good first step: the plan starts from the instructions.'],
 ['Change line 1 of docs/report.md to "# Recorded events this run".','accept','Exactly the requested change, in the only file it needs.'],
 ['Since the report now says "events", rename participant_id to learner_id in data/good.csv and data/missing.csv for consistency.','reject','Scope creep into source evidence. Renaming a column changes the data contract, which the workflow checks. Not requested, not authorized.'],
 ['Update tests/test_workflow.py so the tests match the new column name.','reject','A consequence of the previous bad step: editing checks to fit an unapproved change. Reject both together.'],
 ['Run the tests and generate the report into runs/good-01 to confirm.','revise','Running checks is right, but runs/good-01 already exists and the workflow refuses to overwrite it. Revise: use a new folder such as runs/good-02.']
];
const PLAN_LABEL = {accept:'Accept', revise:'Revise', reject:'Reject'};

const STATUS = ' M docs/report.md\n M src/workflow.py\n?? agent_notes.md';
const DIFF = [
 ['meta','--- a/docs/report.md'],['meta','+++ b/docs/report.md'],['del','-# Learners this run'],['add','+# Recorded events this run'],
 ['meta','--- a/src/workflow.py'],['meta','+++ b/src/workflow.py'],
 ['del',"-        'state': 'BLOCKED' if held or not rows else 'VALIDATED_TRAINING_ONLY',"],
 ['add',"+        'state': 'BLOCKED' if not rows else 'VALIDATED_TRAINING_ONLY',"]
];
const PATHS = [
 ['docs/report.md','yes','In scope: this is the approved heading change.'],
 ['src/workflow.py','no','Out of scope, and dangerous: runs with held rows would no longer be BLOCKED, so missing.csv would produce a "validated" curated file. It is one short line; read it closely.'],
 ['agent_notes.md','no','Untracked (??). Not in the plan. It does not appear in git diff at all: only status reveals it. Ask what it contains before keeping it.']
];
const DECISIONS = [
 ['accept','Accept everything: the agent says the tests pass.','An assertion is not evidence. If you ran the tests, test_missing_stays_visible_and_blocks_curated would fail against this code.'],
 ['partial','Keep the heading change; ask the agent to revert src/workflow.py and explain why it changed it; hold until you have rerun the checks.','Right: preserve the in-scope work, undo the out-of-scope change through review, and verify again before accepting.'],
 ['reset','Run git reset --hard and start over.','This destroys the evidence of what the agent did (and anyone else’s uncommitted work). Review first; revert narrowly.']
];
const VERIFY = [
 ['tests','Run the tests myself and read the output',true,'Yes. Observed output replaces the agent’s claim.'],
 ['missing','Run data/missing.csv into a new folder and confirm it is still BLOCKED',true,'Yes. This directly tests the behavior the code change touched.'],
 ['data','Confirm git status shows no change under data/',true,'Yes. Source preservation is a mandatory gate.'],
 ['report','Open the new report.html and read the heading',true,'Yes. The tests do not check the heading; only you reading the output does.'],
 ['trust','Accept the agent’s summary because it has been reliable today',false,'No. A summary is a claim. Earlier reliability does not verify this change.']
];

let visited = new Set(), predicted = false;

function mark(node, ok, text, cls) { const d = el('div', {className: 'fb ' + (cls || (ok ? 'ok' : 'bad'))}, (ok ? '✓ ' : '✗ ') + text); node.append(d); }

function buildPredict() {
 const box = $('predict-list');
 FILES.forEach((f, i) => { const l = el('label'); const c = el('input', {type:'checkbox', id:'p' + i, value:f.path}); l.append(c, document.createTextNode(f.path)); box.append(l); });
}
function buildTree() {
 FILES.forEach(f => {
  const li = el('li'); const b = el('button', {type:'button', className:'z-' + f.zone}); b.dataset.file = f.path; b.setAttribute('aria-pressed', 'false');
  b.append(el('span', {}, f.path), el('span', {className:'tag'}, f.label));
  b.addEventListener('click', () => openFile(f, b)); li.append(b); $('tree').append(li);
 });
}
function openFile(f, b) {
 visited.add(f.path);
 document.querySelectorAll('#tree button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
 $('file-role').textContent = f.path + ': ' + f.label + ': ' + f.role;
 $('file-content').textContent = f.text; $('file-git').textContent = f.git;
 const need = ['README.md', 'AGENTS.md', 'docs/runbook.md'].filter(p => !visited.has(p));
 $('read-progress').textContent = need.length ? 'Instruction files still to open: ' + need.join(', ') : '✓ You have opened all three instruction files.';
}

$('predict-check').addEventListener('click', () => {
 const chosen = FILES.filter((f, i) => $('p' + i).checked);
 const fb = $('predict-feedback'); fb.replaceChildren();
 if (!chosen.length) { fb.textContent = 'Tick at least one file so you have a prediction to compare against.'; return; }
 predicted = true;
 const right = chosen.length === 1 && chosen[0].path === 'docs/report.md';
 fb.append(el('p', {}, right ? 'Your prediction matches: only docs/report.md should change.' : 'Compare your prediction with the repository roles: only docs/report.md should change.'));
 chosen.filter(f => !f.change).forEach(f => mark(fb, false, f.path + ': ' + WHY_NOT[f.zone]));
 if (!chosen.some(f => f.change)) mark(fb, false, 'docs/report.md: the heading lives here, so this is the one file that must change.');
 else mark(fb, true, 'docs/report.md: the seeded heading defect lives here.');
 $('explore').hidden = false; $('step2').disabled = false; $('predict-check').disabled = true;
 FILES.forEach((f, i) => { $('p' + i).disabled = true; });
});

function buildSort() {
 ACTIONS.forEach(([text], i) => {
  const row = el('div', {className:'sort'}); const id = 'a' + i;
  const lab = el('label', {htmlFor:id}, text); const s = el('select', {id});
  s.append(el('option', {value:''}, 'Choose…')); Object.entries(SORT_LABEL).forEach(([v, t]) => s.append(el('option', {value:v}, t)));
  row.append(lab, s); $('sort-list').append(row);
 });
}
$('sort-check').addEventListener('click', () => {
 const fb = $('sort-feedback'); fb.replaceChildren();
 const picks = ACTIONS.map((a, i) => $('a' + i).value);
 if (picks.some(p => !p)) { fb.textContent = 'Sort every action first. Leaving one undecided is the same as letting the agent decide.'; return; }
 let right = 0, unsafe = 0;
 ACTIONS.forEach(([text, want, why], i) => { const ok = picks[i] === want; if (ok) right++; if (want === 'stop' && !ok) unsafe++;
  mark(fb, ok, text + ' → ' + SORT_LABEL[want] + '. ' + why, ok ? 'ok' : (want === 'stop' ? 'bad' : 'hold')); });
 fb.prepend(el('p', {}, `${right} of ${ACTIONS.length} match the project rules.` + (unsafe ? ` ${unsafe} action(s) you allowed must stop: these are the safety-critical ones to discuss with your supervisor.` : ' No stop-actions were allowed.')));
 $('step3').disabled = false;
});

function buildPlan() {
 PLAN.forEach(([text], i) => {
  const f = el('div', {className:'sort'}); const id = 'pl' + i;
  const l = el('label', {htmlFor:id}, (i + 1) + '. ' + text); const s = el('select', {id});
  s.append(el('option', {value:''}, 'Decide…')); Object.entries(PLAN_LABEL).forEach(([v, t]) => s.append(el('option', {value:v}, t)));
  f.append(l, s); $('plan-list').append(f);
 });
}
$('plan-check').addEventListener('click', () => {
 const fb = $('plan-feedback'); fb.replaceChildren();
 const picks = PLAN.map((p, i) => $('pl' + i).value);
 if (picks.some(p => !p)) { fb.textContent = 'Decide on every step. An unreviewed step is an approved step.'; return; }
 let right = 0; PLAN.forEach(([text, want, why], i) => { const ok = picks[i] === want; if (ok) right++; mark(fb, ok, `Step ${i + 1}: ${PLAN_LABEL[want]}. ${why}`, ok ? 'ok' : 'bad'); });
 fb.prepend(el('p', {}, `${right} of ${PLAN.length} decisions match. The approved plan is steps 1 and 2, plus step 5 revised to use runs/good-02.`));
 $('step4').disabled = false;
});

function buildDiff() {
 $('status-view').textContent = STATUS;
 DIFF.forEach(([cls, line]) => $('diff-view').append(el('span', {className:cls}, line)));
 const q = $('diff-questions');
 q.append(el('h3', {}, 'a. Is each changed path inside the approved plan?'));
 PATHS.forEach(([p], i) => { const f = el('div', {className:'sort'}); const s = el('select', {id:'d' + i}); s.append(el('option', {value:''}, 'Decide…'), el('option', {value:'yes'}, 'In scope'), el('option', {value:'no'}, 'Out of scope')); f.append(el('label', {htmlFor:'d' + i}, p), s); q.append(f); });
 q.append(el('h3', {}, 'b. What do you do next?'));
 DECISIONS.forEach(([v, t]) => { const l = el('label'); l.append(el('input', {type:'radio', name:'next', value:v}), document.createTextNode(t)); q.append(l); });
 q.append(el('h3', {}, 'c. Before accepting, what will you check yourself? Tick all that apply.'));
 VERIFY.forEach(([v, t]) => { const l = el('label'); l.append(el('input', {type:'checkbox', name:'verify', value:v}), document.createTextNode(t)); q.append(l); });
}
$('diff-check').addEventListener('click', () => {
 const fb = $('diff-feedback'); fb.replaceChildren();
 const scope = PATHS.map((p, i) => $('d' + i).value); const next = document.querySelector('input[name=next]:checked');
 if (scope.some(s => !s) || !next) { fb.textContent = 'Answer parts a and b before submitting.'; return; }
 PATHS.forEach(([p, want, why], i) => mark(fb, scope[i] === want, p + ': ' + (want === 'yes' ? 'in scope. ' : 'out of scope. ') + why));
 const d = DECISIONS.find(x => x[0] === next.value); mark(fb, d[0] === 'partial', d[2]);
 const ticked = new Set([...document.querySelectorAll('input[name=verify]:checked')].map(x => x.value));
 VERIFY.forEach(([v, t, want, why]) => { if (ticked.has(v) !== want) mark(fb, false, (want ? 'Missing: ' : 'Remove: ') + t + '. ' + why); });
 if (VERIFY.every(([v, , want]) => ticked.has(v) === want)) mark(fb, true, 'Your verification list covers the tests, the failure case, the source and the actual report.');
 $('step5').disabled = false;
});

['environment', 'task', 'approval'].forEach(id => $(id).addEventListener('change', () => { $('result').textContent = 'Context changed: make a new prediction and reveal again. The previous decision does not carry over.'; $('decision-predict').value = ''; }));
$('review').addEventListener('click', () => {
 const guess = $('decision-predict').value;
 if (!guess) { $('result').textContent = 'Choose a prediction first. The point is to compare your judgment with the rule.'; return; }
 let message, want;
 if ($('task').value === 'identity') { want = 'stop'; message = 'STOP: filling a missing identity is a source-owner decision, not a wording fix. Preserve the held row and escalate with safe evidence.'; }
 else if ($('environment').value === 'production') { want = 'stop'; message = 'STOP: this rehearsal authorizes nothing in production. A live task needs the owner’s written brief, permitted actions and a recovery path.'; }
 else if (!$('approval').checked) { want = 'hold'; message = 'HOLD: the plan is narrow, but no reviewer has approved it. Share the plan and wait.'; }
 else if (!['README.md', 'AGENTS.md', 'docs/runbook.md'].every(f => visited.has(f))) { want = 'hold'; message = 'INSPECT FIRST: approval exists, but you have not opened README, AGENTS and the runbook in Step 1. Approval of a plan you have not checked against the rules is weak evidence.'; }
 else { want = 'proceed'; message = 'SUPERVISED REHEARSAL: training copy, narrow task, instructions read, reviewer approved. Next: execute, then review status, diff, tests and a fresh report exactly as in Step 4.'; }
 $('result').textContent = message + (guess === want ? ' Your prediction matched.' : ' Your prediction did not match: which condition did you weigh differently?');
});
$('reset').addEventListener('click', () => location.reload());

buildPredict(); buildTree(); buildSort(); buildPlan(); buildDiff();
