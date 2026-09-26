export function start() { document.documentElement.classList.add('js-ready'); }
export function text(id, value) { document.getElementById(id).textContent = String(value); }
export function tableRows(id, rows) {
  const body = document.getElementById(id);
  body.replaceChildren(...rows.map(values => {
    const tr = document.createElement('tr');
    values.forEach((value, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = String(value); tr.append(cell);
    });
    return tr;
  }));
}
export function wirePrediction(onUnlock, onReset) {
  const form = document.getElementById('prediction-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const answer = new FormData(form).get('prediction');
    document.getElementById('controls').disabled = false;
    document.getElementById('result').hidden = false;
    text('prediction-note', 'Prediction recorded for this attempt. Change a control, then compare the evidence below. Nothing is saved or sent.');
    onUnlock(answer);
    document.querySelector('#controls input, #controls select').focus();
  });
  document.getElementById('reset-activity').addEventListener('click', () => {
    form.reset(); document.getElementById('manipulation-form').reset();
    document.getElementById('controls').disabled = true;
    document.getElementById('result').hidden = true;
    text('prediction-note', 'Reset complete. Make a new prediction to unlock the controls.');
    onReset(); document.querySelector('#prediction-form input').focus();
  });
}
