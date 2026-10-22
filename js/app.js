import { $, $$, ri, rr, pick, shuffle, esc, store, hex, hx, grp, bits, SUB } from './util.js';
import { REGS, DATA_BASE, regIdx, rn, ESC, numTok, stripComment, SPEC, HINT, classify, assemble, RunErr, run, memWord, traceComments } from './mips.js';
import { TOPICS, TOPIC_KEYS, mc, tf, multi, num, match, order, code, P, BANK, toSigned, genConv, SCHEMES, valueIn, genSigned, genOps, genUnits, genAscii, T_REGS, traceQ, genTrace, genEndian, GEN } from './questions.js';
import { parseNum, fmtAns, codeResult, prep, initState, answered, grade, TYPE_LABEL, typeLabel, explain } from './grading.js';

/* ================= renderers ================= */
function renderBody(q, st, el, locked, onChange) {
  const ok = locked ? grade(q, st) : null; const L = 'ABCDEFGH';
  if (q.type === 'mc' || q.type === 'multi') {
    const isM = q.type === 'multi';
    el.innerHTML = `<div class="opts ${q.two ? 'two' : ''}">` + q.opts.map((o, i) => {
      const chosen = isM ? st.sel.includes(i) : st.sel === i; const correct = isM ? q.ans.includes(i) : q.ans === i;
      let cls = chosen ? 'sel' : '';
      if (locked) cls = correct ? (chosen || !isM ? 'right' : 'missed') : (chosen ? 'wrong' : '');
      return `<button class="opt ${cls}" data-i="${i}" ${locked ? 'disabled' : ''}><span class="key">${isM ? (chosen ? '✓' : '') : L[i]}</span><span class="otext">${o}</span></button>`;
    }).join('') + '</div>' + (isM && !locked ? '<p class="hint">Select every correct option, then check.</p>' : '') + (isM && locked ? '<p class="hint">Dashed green = correct option you missed.</p>' : '');
    if (!locked) $$('.opt', el).forEach(b => b.onclick = () => { const i = +b.dataset.i; if (isM) st.sel = st.sel.includes(i) ? st.sel.filter(x => x !== i) : [...st.sel, i]; else st.sel = i; renderBody(q, st, el, false, onChange); onChange(); });
  }
  else if (q.type === 'num') {
    const ph = q.any ? 'e.g. 42 or 0x2A' : q.base === 2 ? (q.width ? `${q.width} bits, e.g. ${'0'.repeat(q.width)}` : 'binary, e.g. 1011') : q.base === 16 ? (q.width ? `${q.width} hex digits` : 'hex, e.g. 0x3A') : 'number';
    el.innerHTML = `<div class="row"><input class="fill ${locked ? (ok ? 'right' : 'wrong') : ''}" id="num-input" autocomplete="off" spellcheck="false" inputmode="${q.base === 10 && !q.any ? 'numeric' : 'text'}" placeholder="${esc(ph)}" value="${esc(st.val)}" ${locked ? 'disabled' : ''}><span class="hint">${q.any ? 'Decimal, or hex with 0x' : q.base === 2 ? 'Binary (spaces OK)' : q.base === 16 ? 'Hex (0x optional)' : 'Decimal'}</span></div>`;
    if (!locked) { const inp = $('input', el); inp.oninput = () => { st.val = inp.value; onChange(); }; setTimeout(() => inp.focus({ preventScroll: true }), 0); }
  }
  else if (q.type === 'match') {
    el.innerHTML = '<div>' + q.pairs.map((p, i) => {
      const cls = locked ? (st.sel[i] === p[1] ? 'right' : 'wrong') : '';
      return `<div class="mrow"><div>${/^[.$']|^(la|lw|li|sw|lb) /.test(p[0]) ? `<code>${esc(p[0])}</code>` : esc(p[0])}</div><div><select data-i="${i}" id="m-${i}" class="${cls}" ${locked ? 'disabled' : ''}><option value="">Choose…</option>` +
        q.rights.map(r => `<option ${st.sel[i] === r ? 'selected' : ''}>${esc(r)}</option>`).join('') + `</select>${locked && st.sel[i] !== p[1] ? `<div class="fix">✓ ${esc(p[1])}</div>` : ''}</div></div>`;
    }).join('') + '</div>';
    if (!locked) $$('select', el).forEach(s => s.onchange = () => { st.sel[+s.dataset.i] = s.value; onChange(); });
  }
  else if (q.type === 'order') {
    el.innerHTML = '<ol class="olist">' + st.ord.map((si, pos) => `<li class="oitem ${locked ? (si === pos ? 'right' : 'wrong') : ''}"><span class="pos">${pos + 1}</span><span class="otext">${esc(q.steps[si])}</span>` +
      (locked ? '' : `<span class="mv"><button data-p="${pos}" data-d="-1" ${pos === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button data-p="${pos}" data-d="1" ${pos === st.ord.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></span>`) + '</li>').join('') + '</ol>';
    if (!locked) $$('.mv button', el).forEach(b => b.onclick = () => { const p = +b.dataset.p, d = +b.dataset.d; [st.ord[p], st.ord[p + d]] = [st.ord[p + d], st.ord[p]]; renderBody(q, st, el, false, onChange); onChange(); });
  }
  else if (q.type === 'code') {
    const ins = Object.keys(q.inputs || {}); const outs = q.outs || [];
    el.innerHTML = `<div class="spec">${ins.length ? `<span>Inputs already set: <b>${ins.join(', ')}</b></span>` : ''}${outs.length ? `<span>Result in: <b>${outs.join(', ')}</b></span>` : ''}${q.mem ? `<span>Checked in memory: <b>${q.mem.map(m => m[0]).join(', ')}</b></span>` : ''}${q.forbid ? `<span>Not allowed: <b>${q.forbid.join(', ')}</b></span>` : ''}</div>
      <div class="editor"><div class="ebar"><span>MIPS · MARS rules</span><span>${locked ? 'submitted' : 'type your code'}</span></div><textarea class="code" id="code-ed" spellcheck="false" autocapitalize="off" autocomplete="off" ${locked ? 'disabled' : ''}>${esc(st.src)}</textarea></div>
      ${locked ? '' : '<div class="row"><button class="btn sec small" data-act="run">Run with sample inputs</button><span class="hint">Running doesn’t grade it. Check does.</span></div>'}
      <div data-out></div>`;
    const out = $('[data-out]', el);
    const showOut = () => { if (st.out) out.innerHTML = st.out; };
    showOut();
    if (!locked) {
      const ta = $('textarea', el);
      ta.oninput = () => { st.src = ta.value; onChange(); };
      ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); st.src = ta.value; onChange(); } };
      $('[data-act="run"]', el).onclick = () => {
        const prog = assemble(st.src);
        if (prog.errors.length) { st.out = `<div class="runout err">${esc(prog.errors.slice(0, 4).map(e => `Line ${e.line}: ${e.msg}`).join('\n'))}</div>`; return showOut(); }
        const init = {}; for (const r in q.inputs || {}) init[r] = q.inputs[r]();
        try {
          const res = run(prog, init);
          const shown = REGS.map((n, i) => i).filter(i => i && i !== 28 && i !== 29 && res.R[i] !== 0);
          const words = Object.entries(res.labels).filter(([, a]) => a >= DATA_BASE).slice(0, 4).map(([l, a]) => `${l}: ${[0, 1, 2, 3].filter(j => a + 4 * j < DATA_BASE + Math.max(prog.dataEnd, 4)).map(j => memWord(res, a + 4 * j)).join(', ')}`);
          st.out = `<div class="runout">${Object.keys(init).length ? 'Inputs: ' + esc(Object.entries(init).map(([r, v]) => `${r}=${v}`).join(', ')) + '\n' : ''}<div class="regs">${shown.map(i => `<span>${rn(i)} = ${res.R[i]} (${hex(res.R[i])})</span>`).join('') || '<span>All registers are 0.</span>'}${res.hi || res.lo ? `<span>Hi = ${res.hi}, Lo = ${res.lo}</span>` : ''}</div>${words.length ? '\nMemory words: ' + esc(words.join(' | ')) : ''}${res.warns.length ? '\n' + esc(res.warns.join('\n')) : ''}</div>`;
        } catch (e) { st.out = `<div class="runout err">Line ${e.line}: ${esc(e.message)}</div>`; }
        showOut();
      };
    }
  }
}

/* ================= app ================= */
const app = $('#app');
const settings = Object.assign({ len: 25, feedback: 'instant', topics: [...TOPIC_KEYS] }, store.get('md-settings', {}));
settings.topics = settings.topics.filter(t => TOPICS[t]);
const saveSettings = () => store.set('md-settings', settings);
let hist = store.get('md-history', {});
function record(topic, ok) { const h = hist[topic] || { c: 0, n: 0 }; h.n++; if (ok) h.c++; hist[topic] = h; store.set('md-history', hist); }
let sess = null, timer = null;
const wrap = q => { const p = prep(q); return { q: p, st: initState(p), locked: false, ok: null }; };

function buildQueue(topics, n) {
  const bank = shuffle(BANK.filter(q => topics.includes(q.topic)));
  const genTopics = topics.filter(t => GEN[t]); const out = [];
  if (n === 'all') { out.push(...bank); genTopics.forEach(t => GEN[t].forEach(g => out.push(g(), g()))); }
  else {
    const nGen = genTopics.length ? Math.round(n * 0.4) : 0;
    const byTopic = {}; bank.forEach(q => (byTopic[q.topic] = byTopic[q.topic] || []).push(q));
    const keys = shuffle(Object.keys(byTopic)); let k = 0;
    while (out.length < n - nGen && keys.some(t => byTopic[t].length)) { const t = keys[k++ % keys.length]; if (byTopic[t].length) out.push(byTopic[t].pop()); }
    let g = 0; const gt = shuffle(genTopics);
    while (out.length < n && gt.length) { const t = gt[g++ % gt.length]; out.push(pick(GEN[t])()); }
  }
  return shuffle(out).map(wrap);
}
let labPool = [];
function labItem() {
  if (Math.random() < 0.55) { if (!labPool.length) labPool = shuffle(BANK.filter(q => q.type === 'code')); return wrap(labPool.pop()); }
  return wrap(Math.random() < 0.8 ? genTrace() : genEndian());
}
function startSession(mode) {
  let items;
  if (mode === 'mock') items = buildQueue(TOPIC_KEYS, settings.len);
  else if (mode === 'drill') items = buildQueue(settings.topics.length ? settings.topics : TOPIC_KEYS, settings.len);
  else items = [labItem()];
  sess = { mode, items, i: 0, exam: mode !== 'lab' && settings.feedback === 'end', start: Date.now(), done: false };
  renderQuiz(); window.scrollTo(0, 0);
}
function retryMissed() {
  const missed = sess.items.filter(it => !it.ok).map(it => wrap(it.q));
  if (!missed.length) return;
  sess = { mode: 'retry', items: shuffle(missed), i: 0, exam: false, start: Date.now(), done: false };
  renderQuiz(); window.scrollTo(0, 0);
}

const REFERENCE = `<details class="ref"><summary>Quick reference: what to use when</summary><div class="refbody">
<div><h3>Instructions</h3><div class="tscroll"><table class="tt"><thead><tr><th>You want</th><th>Use</th></tr></thead><tbody>
<tr><td>d = a + b / a − b</td><td><code>add $d, $a, $b</code> / <code>sub $d, $a, $b</code></td></tr>
<tr><td>d = a + constant (or − constant)</td><td><code>addi $d, $a, 5</code> / <code>addi $d, $a, -5</code></td></tr>
<tr><td>d = constant</td><td><code>li $d, 42</code> or <code>addi $d, $zero, 42</code></td></tr>
<tr><td>d = address of a label</td><td><code>la $d, A</code></td></tr>
<tr><td>d = word in memory</td><td><code>lw $d, 8($base)</code></td></tr>
<tr><td>memory = register</td><td><code>sw $s, 8($base)</code></td></tr>
<tr><td>a byte / char</td><td><code>lbu</code> (or <code>lb</code> to sign-extend), <code>sb</code></td></tr>
<tr><td>d = a × b (fits in 32 bits)</td><td><code>mul $d, $a, $b</code> or <code>mult</code> + <code>mflo</code></td></tr>
<tr><td>quotient / remainder</td><td><code>div $a, $b</code> then <code>mflo</code> / <code>mfhi</code></td></tr>
<tr><td>× 2ᵏ / ÷ 2ᵏ (unsigned)</td><td><code>sll $d, $a, k</code> / <code>srl $d, $a, k</code></td></tr>
<tr><td>keep / set / flip bits</td><td><code>andi</code> / <code>ori</code> / <code>xori</code> with a mask</td></tr>
<tr><td>flip all bits</td><td><code>not $d, $a</code> = <code>nor $d, $a, $zero</code></td></tr>
<tr><td>A[i] with variable i</td><td><code>sll $t, $i, 2</code> → <code>add $t, $t, $base</code> → <code>lw $d, 0($t)</code></td></tr>
</tbody></table></div></div>
<div><h3>Special cases</h3><ul>
<li>Exactly 3 operands: destination first. <code>s0 = a + b + c</code> needs two adds.</li>
<li>No <code>subi</code>, <code>noti</code>, <code>muli</code>. Use <code>addi</code> with a negative, <code>not</code>, <code>mul</code>/<code>sll</code>.</li>
<li>Only load/store touch memory. <code>add $t0, $t1, 4($t2)</code> is invalid.</li>
<li>Offset must be a constant written outside the parentheses: <code>12($t0)</code>, never <code>$t1($t0)</code> or <code>12 + $t0</code>.</li>
<li>Array offset = index × 4 for words, × 1 for bytes. <code>lw</code>/<code>sw</code> addresses must be multiples of 4.</li>
<li><code>div</code>: Lo = quotient, Hi = remainder. <code>mult</code>: Hi:Lo = 64-bit product.</li>
<li><code>andi</code>/<code>ori</code>/<code>xori</code> zero-extend their 16-bit constant: <code>andi $t1,$t0,0xFFFF</code> keeps the low half.</li>
<li><code>add</code>/<code>addi</code>/<code>sub</code> trap on signed overflow; <code>addu</code>/<code>addiu</code>/<code>subu</code> don’t.</li>
<li>Writing to <code>$zero</code> does nothing. Don’t use <code>$at</code>.</li>
<li><code>.space n</code> is n <em>bytes</em> (5 ints = 20). <code>.asciiz</code> adds the 0 byte; <code>.ascii</code> doesn’t. <code>.word</code> auto-aligns to 4.</li>
<li>MARS: text at 0x00400000, data at 0x10010000, little endian.</li>
</ul></div></div></details>`;

function renderHome() {
  clearInterval(timer);
  const seg = (key, vals) => `<div class="seg" role="group">` + vals.map(([v, l]) => `<button data-set="${key}" data-v="${v}" aria-pressed="${String(settings[key]) === String(v)}">${l}</button>`).join('') + '</div>';
  const pct = t => hist[t] && hist[t].n ? Math.round(100 * hist[t].c / hist[t].n) : null;
  app.innerHTML = `
  <header class="hero">
    <div class="eyebrow">Computer organization · Lectures 2–6</div>
    <h1>MIPS Drill<span class="reg" aria-hidden="true">$t0</span></h1>
    <p class="lede">Practice the binary system and MIPS assembly: conversions, signed numbers, overflow, choosing the right instruction, memory access, and writing real MIPS that gets checked against random test inputs.</p>
  </header>
  <section class="modes">
    <button class="mode primary" data-mode="mock"><h3>Mock quiz</h3><p>A mix of every topic, including code to write.</p><span class="go">Start →</span></button>
    <button class="mode" data-mode="drill"><h3>Topic drill</h3><p>Only the topics you pick below.</p><span class="go">Start drill →</span></button>
    <button class="mode" data-mode="lab"><h3>Code lab</h3><p>Endless write-the-code and trace-the-code practice.</p><span class="go">Open lab →</span></button>
  </section>
  <section class="panel settings">
    <div class="row"><span class="lbl">Length</span>${seg('len', [[10, '10'], [25, '25'], [40, '40'], ['all', 'Everything']])}</div>
    <div class="row"><span class="lbl">Feedback</span>${seg('feedback', [['instant', 'After each question'], ['end', 'At the end (exam)']])}</div>
  </section>
  <section class="panel">
    <div class="toprow"><h2>Topics for drill</h2><span><button class="link" data-act="allt">Select all</button> · <button class="link" data-act="reset">Reset progress</button></span></div>
    <div class="topics">${TOPIC_KEYS.map(t => { const p = pct(t); const on = settings.topics.includes(t);
      return `<button class="topic" data-t="${t}" aria-pressed="${on}"><span class="box">${on ? '✓' : ''}</span><span class="tn">${TOPICS[t]}</span><span class="meter"><span class="bar"><i style="width:${p ?? 0}%"></i></span>${p === null ? 'not tried' : `${p}% of ${hist[t].n}`}</span></button>`; }).join('')}</div>
  </section>
  ${REFERENCE}`;
  $$('.mode', app).forEach(b => b.onclick = () => startSession(b.dataset.mode));
  $$('[data-set]', app).forEach(b => b.onclick = () => { const v = b.dataset.v; settings[b.dataset.set] = isNaN(+v) ? v : +v; saveSettings(); renderHome(); });
  $$('.topic', app).forEach(b => b.onclick = () => { const t = b.dataset.t; settings.topics = settings.topics.includes(t) ? settings.topics.filter(x => x !== t) : [...settings.topics, t]; saveSettings(); renderHome(); });
  $('[data-act="allt"]', app).onclick = () => { settings.topics = [...TOPIC_KEYS]; saveSettings(); renderHome(); };
  const rs = $('[data-act="reset"]', app);
  rs.onclick = () => { if (rs.dataset.armed) { hist = {}; store.set('md-history', hist); renderHome(); } else { rs.dataset.armed = 1; rs.textContent = 'Tap again to clear'; } };
}

const fmtTime = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function renderQuiz() {
  const it = sess.items[sess.i]; const n = sess.items.length; const lab = sess.mode === 'lab';
  const score = sess.items.filter(x => x.locked && x.ok).length, doneN = sess.items.filter(x => x.locked).length;
  app.innerHTML = `
  <div class="qbar">
    <div class="top"><button class="ghost" id="endBtn">${sess.exam ? 'Submit early' : 'End'}</button>
      <div class="qprog">${lab ? `Lab · item ${sess.i + 1}` : `Question ${sess.i + 1} of ${n}`}</div>
      <div class="qstat" id="qstat">${sess.exam ? fmtTime(Date.now() - sess.start) : `${score}/${doneN} ✓`}</div></div>
    ${lab ? '' : `<div class="track"><i style="width:${100 * (sess.i + (it.locked ? 1 : 0)) / n}%"></i></div>`}
    ${sess.exam ? `<div class="dots">${sess.items.map((x, i) => `<button data-j="${i}" class="${answered(x.q, x.st) ? 'ans' : ''} ${i === sess.i ? 'cur' : ''}" aria-label="Go to question ${i + 1}">${i + 1}</button>`).join('')}</div>` : ''}
  </div>
  <article class="qcard">
    <div class="qmeta"><span class="chip">${TOPICS[it.q.topic]}</span><span class="qtype">${typeLabel(it.q)}${it.q.gen ? ' · generated' : ''}</span></div>
    <div class="prompt">${it.q.q}</div>
    <div class="qbody" id="qbody"></div>
    <div id="fb"></div>
  </article>
  <div class="actions">
    <div class="l">${sess.exam && sess.i > 0 ? '<button class="btn sec" id="backBtn">← Back</button>' : ''}${!sess.exam && !it.locked ? '<button class="btn sec" id="revealBtn">Show answer</button>' : ''}</div>
    <div class="r"><button class="btn" id="primary"></button></div>
  </div>
  <p class="hint" style="margin-top:10px">${it.q.type === 'code' ? 'Tab indents. Use the Check button when you’re done.' : `Keys: 1–${Math.max(2, (it.q.opts || []).length)} pick an option · Enter ${sess.exam ? 'next' : 'check / next'}`}</p>`;
  const body = $('#qbody'), prim = $('#primary');
  const update = () => {
    if (sess.exam) { prim.textContent = sess.i === n - 1 ? 'Submit quiz' : 'Next →'; prim.disabled = false; const d = $(`.dots [data-j="${sess.i}"]`); if (d) d.classList.toggle('ans', answered(it.q, it.st)); return; }
    if (!it.locked) { prim.textContent = 'Check'; prim.disabled = !answered(it.q, it.st); }
    else { prim.textContent = lab ? 'Next item →' : sess.i === n - 1 ? 'See results' : 'Next →'; prim.disabled = false; }
  };
  const showFeedback = () => { $('#fb').innerHTML = `<div class="feedback ${it.ok ? 'ok' : 'bad'}"><div class="verdict">${it.ok ? 'Correct' : it.revealed ? 'Answer' : 'Not quite'}</div>${explain(it.q, it.revealed ? null : it.st)}</div>`; };
  renderBody(it.q, it.st, body, it.locked, update);
  if (it.locked) showFeedback();
  update();
  const lock = () => {
    it.locked = true; it.ok = it.revealed ? false : grade(it.q, it.st); record(it.q.topic, it.ok);
    renderBody(it.q, it.st, body, true, update); showFeedback(); update(); $('#revealBtn')?.remove();
    const s = $('#qstat'); if (s) s.textContent = `${sess.items.filter(x => x.locked && x.ok).length}/${sess.items.filter(x => x.locked).length} ✓`;
    $('#fb').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  };
  prim.onclick = () => {
    if (sess.exam) { if (sess.i === n - 1) return finish(); sess.i++; renderQuiz(); return window.scrollTo(0, 0); }
    if (!it.locked) return lock();
    if (lab) { sess.items.push(labItem()); sess.i++; renderQuiz(); return window.scrollTo(0, 0); }
    if (sess.i === n - 1) return finish();
    sess.i++; renderQuiz(); window.scrollTo(0, 0);
  };
  const rv = $('#revealBtn'); if (rv) rv.onclick = () => { it.revealed = true; lock(); };
  const bk = $('#backBtn'); if (bk) bk.onclick = () => { sess.i--; renderQuiz(); };
  $$('.dots button').forEach(b => b.onclick = () => { sess.i = +b.dataset.j; renderQuiz(); });
  $('#endBtn').onclick = () => finish();
  clearInterval(timer);
  if (sess.exam) timer = setInterval(() => { const s = $('#qstat'); if (s) s.textContent = fmtTime(Date.now() - sess.start); }, 1000);
}
document.addEventListener('keydown', e => {
  if (!sess || sess.done || !$('#primary')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'textarea') return;
  if (e.key === 'Enter' && tag !== 'select' && tag !== 'button') { const p = $('#primary'); if (!p.disabled) { e.preventDefault(); p.click(); } return; }
  if (tag === 'input' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-9]$/.test(e.key)) { const b = $$('#qbody .opt')[+e.key - 1]; if (b && !b.disabled) b.click(); }
});
function finish() {
  clearInterval(timer);
  if (sess.mode === 'lab') sess.items = sess.items.filter(it => it.locked);
  sess.items.forEach(it => { if (!it.locked) { it.locked = true; it.ok = grade(it.q, it.st); if (answered(it.q, it.st) || sess.exam) record(it.q.topic, it.ok); } });
  sess.done = true; sess.end = Date.now(); renderResults(false);
}
function renderResults(onlyMissed) {
  const items = sess.items, n = items.length, c = items.filter(x => x.ok).length, pct = n ? Math.round(100 * c / n) : 0;
  const R = 52, C = 2 * Math.PI * R;
  const byT = {}; items.forEach(it => { const b = byT[it.q.topic] = byT[it.q.topic] || { c: 0, n: 0 }; b.n++; if (it.ok) b.c++; });
  const msg = n === 0 ? 'No questions answered yet.' : pct >= 85 ? 'Quiz-ready on this set. Try the code lab next.' : pct >= 60 ? 'Solid base. Review the misses below, then retry them.' : 'Read through the explanations below, then retry the missed ones.';
  const cls = p => p >= 80 ? 'hi' : p >= 55 ? 'mid' : 'low';
  app.innerHTML = `
  <header class="res-head">
    <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Score ${pct} percent">
      <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--line)" stroke-width="10"></circle>
      <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--${pct >= 80 ? 'ok' : pct >= 55 ? 'sel' : 'bad'})" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * pct / 100} ${C}" transform="rotate(-90 60 60)"></circle>
      <text x="60" y="68" text-anchor="middle" font-size="28">${pct}%</text></svg>
    <div><h1>${c} of ${n} correct</h1><p>${msg} Time: ${fmtTime(sess.end - sess.start)}.</p></div>
  </header>
  <div class="actions" style="margin-top:0"><div class="l"><button class="btn" id="again">New ${sess.mode === 'lab' ? 'lab session' : 'quiz'}</button>${c < n ? `<button class="btn sec" id="retry">Retry ${n - c} missed</button>` : ''}</div><div class="r"><button class="btn sec" id="home">Home</button></div></div>
  <section class="panel"><h2>By topic</h2><div class="tbars">${Object.keys(byT).map(t => { const b = byT[t], p = Math.round(100 * b.c / b.n);
    return `<div class="tbar"><span>${TOPICS[t]}</span><span class="bar big"><i class="${cls(p)}" style="width:${p}%"></i></span><span class="num">${b.c}/${b.n}</span></div>`; }).join('')}</div></section>
  <section class="panel"><div class="toprow"><h2>Review</h2><div class="seg"><button id="fAll" aria-pressed="${!onlyMissed}">All</button><button id="fMiss" aria-pressed="${onlyMissed}">Missed only</button></div></div><div class="review" id="review"></div></section>`;
  const rv = $('#review');
  items.forEach((it, i) => {
    if (onlyMissed && it.ok) return;
    const card = document.createElement('article'); card.className = 'qcard';
    card.innerHTML = `<div class="rv-head"><div class="qmeta"><span class="qtype">Q${i + 1}</span><span class="chip">${TOPICS[it.q.topic]}</span></div><span class="badge ${it.ok ? 'ok' : 'bad'}">${it.ok ? 'Correct' : answered(it.q, it.st) ? 'Missed' : 'Unanswered'}</span></div><div class="prompt">${it.q.q}</div><div class="qbody"></div><div class="feedback neutral">${explain(it.q, answered(it.q, it.st) ? it.st : null)}</div>`;
    rv.appendChild(card); renderBody(it.q, it.st, $('.qbody', card), true, () => {});
  });
  if (!rv.children.length) rv.innerHTML = '<p class="muted">Nothing missed. Nice work.</p>';
  $('#again').onclick = () => startSession(sess.mode === 'retry' ? 'mock' : sess.mode);
  const rt = $('#retry'); if (rt) rt.onclick = retryMissed;
  $('#home').onclick = () => { sess = null; renderHome(); window.scrollTo(0, 0); };
  $('#fAll').onclick = () => renderResults(false); $('#fMiss').onclick = () => renderResults(true);
  window.scrollTo(0, 0);
}
renderHome();
