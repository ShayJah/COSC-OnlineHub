import { $, shuffle, esc, hex, hx, grp, bits } from './util.js';
import { DATA_BASE, regIdx, assemble, run, memWord } from './mips.js';
import { mc, multi, num, match, order, code, P } from './questions.js';

/* ================= grading ================= */
function parseNum(s, base, any) {
  s = String(s).trim().replace(/[\s_,]/g, '').toLowerCase(); let neg = false;
  if (s[0] === '-') { neg = true; s = s.slice(1); } else if (s[0] === '+') s = s.slice(1);
  let b = base;
  if (s.startsWith('0x')) { b = 16; s = s.slice(2); } else if (s.startsWith('0b')) { b = 2; s = s.slice(2); }
  else if (any) b = 10;
  const ok = { 2: /^[01]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/ }[b];
  if (!s || !ok.test(s)) return { v: NaN };
  const v = parseInt(s, b); return { v: neg ? -v : v, digits: s.length, b };
}
const fmtAns = q => q.any ? `${q.ans} (${hex(q.ans)})` : q.base === 2 ? (q.width ? bits(q.ans, q.width) : grp((q.ans >>> 0).toString(2))) : q.base === 16 ? (q.width ? hex(q.ans, q.width) : hx(q.ans)) : String(q.ans);
function codeResult(q, src) {
  const prog = assemble(src);
  if (prog.errors.length) return { ok: false, msg: prog.errors.slice(0, 3).map(e => `Line ${e.line}: ${e.msg}`).join('\n') };
  const used = new Set(prog.text.map(i => i.op));
  const bad = (q.forbid || []).filter(o => used.has(o));
  if (bad.length) return { ok: false, msg: `This task doesn’t allow ${bad.join(', ')}.` };
  if (q.check === 'decl') {
    const L = prog.labels; const need = ['x', 's', 'arr', 'buf', 'y']; const miss = need.filter(l => L[l] === undefined);
    if (miss.length) return { ok: false, msg: `Missing label(s): ${miss.join(', ')}.` };
    const r = run(prog); const w = a => memWord(r, a); const by = a => r.mem[a - DATA_BASE];
    if (w(L.x) !== 10) return { ok: false, msg: 'x should be a word holding 10.' };
    const str = [0, 1, 2, 3, 4].map(k => by(L.s + k));
    if (str.slice(0, 4).some(c => c !== 98) || str[4] !== 0) return { ok: false, msg: 's should be "bbbb" followed by a null byte (.asciiz).' };
    if (w(L.arr) !== 10 || w(L.arr + 4) !== 30 || w(L.arr + 8) !== 50) return { ok: false, msg: 'arr should hold the words 10, 30, 50.' };
    if (L.y - L.buf < 12) return { ok: false, msg: 'buf needs room for 3 integers = 12 bytes (.space 12).' };
    if (w(L.y) !== 16) return { ok: false, msg: 'y should be a word holding 16.' };
    return { ok: true, msg: 'All five declarations check out.' };
  }
  const refProg = assemble(q.ref);
  for (let k = 0; k < 6; k++) {
    const init = {}; for (const r in q.inputs) init[r] = q.inputs[r]();
    let exp, got;
    try { exp = run(refProg, init); } catch (e) { continue; }
    try { got = run(prog, init); } catch (e) { return { ok: false, msg: `Line ${e.line}: ${e.message}` }; }
    const desc = Object.keys(init).length ? `With ${Object.entries(init).map(([r, v]) => `${r} = ${v}`).join(', ')}: ` : '';
    for (const o of q.outs || []) { const i = regIdx(o); if (exp.R[i] !== got.R[i]) return { ok: false, msg: `${desc}expected ${o} = ${exp.R[i]}, but you got ${got.R[i]}.` }; }
    for (const [label, n, size = 4] of q.mem || []) {
      const base = refProg.labels[label]; if (got.labels[label] !== base) return { ok: false, msg: `Keep the starter’s .data section as given.` };
      for (let j = 0; j < n; j++) {
        const a = base + j * size; const e = size === 4 ? memWord(exp, a) : exp.mem[a - DATA_BASE], g = size === 4 ? memWord(got, a) : got.mem[a - DATA_BASE];
        if (e !== g) return { ok: false, msg: `${desc}expected ${label}[${j}] = ${size === 1 ? `'${String.fromCharCode(e)}'` : e}, but memory holds ${size === 1 ? `'${String.fromCharCode(g)}'` : g}.` };
      }
    }
  }
  return { ok: true, msg: 'Passed every test run with random inputs.' };
}
function prep(q0) {
  const q = { ...q0 };
  if ((q.type === 'mc' || q.type === 'multi') && !q.keep) {
    const perm = shuffle(q.opts.map((_, i) => i));
    q.opts = perm.map(i => q0.opts[i]);
    q.ans = q.type === 'mc' ? perm.indexOf(q0.ans) : q0.ans.map(a => perm.indexOf(a));
  }
  if (q.type === 'match') q.rights = shuffle(q.pairs.map(p => p[1]));
  if (q.type === 'order') { let p; do { p = shuffle(q.steps.map((_, i) => i)); } while (p.every((v, i) => v === i)); q.init = p; }
  return q;
}
function initState(q) {
  switch (q.type) {
    case 'mc': return { sel: null };
    case 'multi': return { sel: [] };
    case 'num': return { val: '' };
    case 'match': return { sel: q.pairs.map(() => '') };
    case 'order': return { ord: [...q.init] };
    case 'code': return { src: q.starter || '', out: null };
  }
}
function answered(q, st) {
  switch (q.type) {
    case 'mc': return st.sel !== null;
    case 'multi': return st.sel.length > 0;
    case 'num': return st.val.trim() !== '';
    case 'match': return st.sel.every(s => s !== '');
    case 'order': return true;
    case 'code': return st.src.trim() !== '' && st.src.trim() !== (q.starter || '').trim();
  }
}
function grade(q, st) {
  switch (q.type) {
    case 'mc': return st.sel === q.ans;
    case 'multi': return st.sel.length === q.ans.length && q.ans.every(a => st.sel.includes(a));
    case 'num': { const p = parseNum(st.val, q.base, q.any); if (isNaN(p.v)) return false;
      if (q.width && p.b === q.base && p.digits !== q.width) return false;
      return q.s32 ? (p.v | 0) === (q.ans | 0) : p.v === q.ans; }
    case 'match': return q.pairs.every((p, i) => st.sel[i] === p[1]);
    case 'order': return st.ord.every((v, i) => v === i);
    case 'code': { if (!st.res || st.res.src !== st.src) st.res = { src: st.src, ...codeResult(q, st.src) }; return st.res.ok; }
  }
}
const TYPE_LABEL = { mc: 'Multiple choice', multi: 'Select all that apply', num: 'Short answer', match: 'Match', order: 'Put in order', code: 'Write the code' };
const typeLabel = q => q.two && q.opts[0] === 'True' ? 'True or false' : TYPE_LABEL[q.type];
function explain(q, st) {
  let h = '';
  if (q.type === 'num') h += `<p><strong>Answer: <code>${esc(fmtAns(q))}</code></strong></p>`;
  if (q.type === 'code' && st) { grade(q, st); h += `<p><strong>${st.res.ok ? 'Checker:' : 'Checker says:'}</strong></p><div class="runout ${st.res.ok ? '' : 'err'}">${esc(st.res.msg)}</div>`; }
  if (q.exp) h += `<p>${q.exp}</p>`;
  if (q.type === 'order') h += '<p>Correct order:</p>' + P(q.steps.join('\n'));
  if (q.type === 'code') h += '<p>One correct solution:</p>' + P(q.ref);
  return h;
}

export { parseNum, fmtAns, codeResult, prep, initState, answered, grade, TYPE_LABEL, typeLabel, explain };
