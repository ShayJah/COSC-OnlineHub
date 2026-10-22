import test from 'node:test';
import assert from 'node:assert/strict';
import { BANK, GEN, TOPICS } from '../js/questions.js';
import { prep, initState, grade } from '../js/grading.js';

// Fill in the correct answer for a prepared question, the way a perfect student would.
function answerCorrectly(q) {
  const st = initState(q);
  if (q.type === 'mc') st.sel = q.ans;
  if (q.type === 'multi') st.sel = [...q.ans];
  if (q.type === 'num') st.val = q.any || q.base === 10 ? String(q.ans) : (q.ans >>> 0).toString(q.base).padStart(q.width || 0, '0');
  if (q.type === 'match') st.sel = q.pairs.map(p => p[1]);
  if (q.type === 'order') st.ord = q.steps.map((_, i) => i);
  if (q.type === 'code') st.src = q.ref;
  return st;
}

test('every bank question accepts its own answer (code: reference passes the checker)', () => {
  for (const q0 of BANK) {
    const q = prep(q0);
    const st = answerCorrectly(q);
    assert.ok(grade(q, st), `${q.topic}: ${q.q.slice(0, 70)} ${st.res?.msg ?? ''}`);
  }
});

test('every generator produces gradeable questions', () => {
  for (const [topic, gens] of Object.entries(GEN)) for (const g of gens) for (let i = 0; i < 300; i++) {
    const q = prep(g());
    assert.ok(grade(q, answerCorrectly(q)), `${topic}: ${q.q.slice(0, 70)}`);
  }
});

test('a wrong code answer is rejected with a concrete counterexample', () => {
  const q = prep(BANK.find(x => x.type === 'code' && x.q.includes('A[i] - 5')));
  const st = initState(q);
  st.src = q.starter + 'lw $s2, 0($t0)\naddi $s2, $s2, -5'; // ignores i
  for (let k = 0; k < 20 && grade(q, st); k++) st.res = null; // random i may be 0; retry
  assert.equal(grade(q, st), false);
  assert.match(st.res.msg, /expected \$s2 = -?\d+, but you got -?\d+/);
});

test('every question and generator uses a topic listed in TOPICS', () => {
  for (const t of [...BANK.map(q => q.topic), ...Object.keys(GEN)]) assert.ok(t in TOPICS, `unknown topic: ${t}`);
});
