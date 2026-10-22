import { esc, hex } from './util.js';

/* ================= MIPS assembler + simulator ================= */
const REGS = ['zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3', 't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 't8', 't9', 'k0', 'k1', 'gp', 'sp', 'fp', 'ra'];
const DATA_BASE = 0x10010000, TEXT_BASE = 0x00400000, MEM_SIZE = 0x10000;
const regIdx = t => { const m = /^\$(\w+)$/.exec(t); if (!m) return -1; if (/^\d+$/.test(m[1])) { const n = +m[1]; return n < 32 ? n : -1; } return REGS.indexOf(m[1].toLowerCase()); };
const rn = i => '$' + REGS[i];
const ESC = { n: 10, t: 9, '0': 0, '\\': 92, "'": 39, '"': 34 };
function numTok(t) {
  let m;
  if ((m = /^'(\\.|[^\\])'$/.exec(t))) return m[1].length === 2 ? (ESC[m[1][1]] ?? m[1].charCodeAt(1)) : m[1].charCodeAt(0);
  if ((m = /^([+-]?)0x([0-9a-f]+)$/i.exec(t))) { const v = parseInt(m[2], 16); return m[1] === '-' ? -v : v; }
  if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
  return null;
}
function stripComment(line) { let q = null; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '\\') i++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '#') return line.slice(0, i); } return line; }
const SPEC = {
  add: 'rrr', addu: 'rrr', sub: 'rrr', subu: 'rrr', and: 'rrr', or: 'rrr', xor: 'rrr', nor: 'rrr', mul: 'rrr', slt: 'rrr',
  addi: 'rri', addiu: 'rri', andi: 'rri', ori: 'rri', xori: 'rri', sll: 'rri', srl: 'rri', sra: 'rri',
  not: 'rr', move: 'rr', mult: 'rr', multu: 'rr', div: 'rr', divu: 'rr', mfhi: 'r', mflo: 'r',
  li: 'ri', la: 'rl', lw: 'rm', lh: 'rm', lhu: 'rm', lb: 'rm', lbu: 'rm', sw: 'rm', sh: 'rm', sb: 'rm', syscall: '', nop: ''
};
const HINT = {
  subi: 'There is no subi. Use addi with a negative constant, e.g. addi $t0, $t0, -10.',
  noti: 'There is no noti. Use not $d, $s (or nor $d, $s, $zero).',
  nori: 'There is no nori. Load the constant into a register first, then use nor.',
  muli: 'There is no muli. Put the constant in a register (li) and use mul, or use sll for powers of 2.',
  mov: 'Use move $d, $s (pseudo) or add $d, $s, $zero.', mv: 'Use move $d, $s (pseudo) or add $d, $s, $zero.',
  load: 'Use lw (word), lb/lbu (byte) or lh/lhu (half-word).', store: 'Use sw, sb or sh.', ld: 'MIPS32 uses lw for words.', st: 'MIPS32 uses sw for words.',
  lwi: 'There is no lwi. Use li for constants, la for addresses, lw for memory.', lui: 'lui is valid MIPS but not used in these lectures; use li for constants.',
  j: 'Jumps and branches come after these lectures; this checker runs straight-line code.', beq: 'Branches come after these lectures; this checker runs straight-line code.', bne: 'Branches come after these lectures; this checker runs straight-line code.'
};
function classify(t, labels) {
  if (/^\$\w+\(\$\w+\)$/.test(t)) return { k: 'bad', msg: 'The offset in front of the parentheses must be a constant. Compute base + 4*i into a register first (sll, add), then use 0($reg).' };
  if (t.startsWith('$')) { const i = regIdx(t); return i < 0 ? { k: 'bad', msg: `Unknown register ${t}.` } : { k: 'r', v: i }; }
  let m;
  if ((m = /^([+-]?(?:0x[0-9a-f]+|\d+))?\((\$\w+)\)$/i.exec(t))) { const b = regIdx(m[2]); if (b < 0) return { k: 'bad', msg: `Unknown register ${m[2]}.` }; return { k: 'm', off: m[1] ? numTok(m[1]) : 0, base: b }; }
  const n = numTok(t); if (n !== null) return { k: 'i', v: n };
  if (/^[A-Za-z_][\w.]*$/.test(t)) return { k: 'l', name: t };
  return { k: 'bad', msg: `I can't read the operand “${t}”.` };
}
function assemble(src) {
  const errors = [], text = [], labels = {}, data = new Uint8Array(MEM_SIZE);
  let seg = 'text', dp = 0, pending = [];
  const bind = addr => { pending.forEach(l => { if (labels[l.name] !== undefined) errors.push({ line: l.ln, msg: `Label “${l.name}” is defined twice.` }); labels[l.name] = addr; }); pending = []; };
  const pend = (name, ln) => pending.push({ name, ln });
  const put = (v, n) => { for (let k = 0; k < n; k++) { if (dp < MEM_SIZE) data[dp] = (v >>> (8 * k)) & 255; dp++; } };
  const align = n => { dp = Math.ceil(dp / n) * n; };
  src.split('\n').forEach((raw, i) => {
    const ln = i + 1; let line = stripComment(raw).trim(); let m;
    while ((m = /^([A-Za-z_][\w.]*)\s*:\s*/.exec(line))) { pend(m[1], ln); line = line.slice(m[0].length); }
    if (/^\d\w*\s*:/.test(line)) { errors.push({ line: ln, msg: 'Labels cannot start with a digit.' }); return; }
    if (!line) return;
    if (line[0] === '.') {
      const dm = /^(\.\w+)\s*(.*)$/.exec(line); const d = dm[1].toLowerCase(), rest = dm[2].trim();
      if (d === '.data') { seg = 'data'; if (rest) { const a = numTok(rest); if (a !== null && a >= DATA_BASE && a < DATA_BASE + MEM_SIZE) dp = a - DATA_BASE; } return; }
      if (d === '.text') { seg = 'text'; return; }
      if (d === '.globl' || d === '.global') return;
      if (seg !== 'data') { errors.push({ line: ln, msg: `${d} belongs in the .data section.` }); return; }
      if (d === '.align') { const n = numTok(rest); align(2 ** (n || 0)); return; }
      if (d === '.ascii' || d === '.asciiz') {
        const sm = /^"((?:[^"\\]|\\.)*)"$/.exec(rest); if (!sm) { errors.push({ line: ln, msg: `${d} needs a string in double quotes.` }); return; }
        bind(DATA_BASE + dp); const s = sm[1].replace(/\\(.)/g, (_, c) => String.fromCharCode(ESC[c] ?? c.charCodeAt(0)));
        for (const ch of s) put(ch.charCodeAt(0), 1); if (d === '.asciiz') put(0, 1); return;
      }
      if (d === '.space') { const n = numTok(rest); if (n === null || n < 0) { errors.push({ line: ln, msg: '.space needs a byte count, e.g. .space 20' }); return; } bind(DATA_BASE + dp); dp += n; return; }
      const size = { '.word': 4, '.half': 2, '.byte': 1 }[d];
      if (!size) { errors.push({ line: ln, msg: `Unknown directive ${d}.` }); return; }
      align(size); bind(DATA_BASE + dp);
      const vals = rest.split(/[\s,]+/).filter(Boolean);
      if (!vals.length) { errors.push({ line: ln, msg: `${d} needs at least one value.` }); return; }
      for (const v of vals) { const n = numTok(v); if (n === null) { errors.push({ line: ln, msg: `${d} value “${v}” is not a number.` }); return; } put(n, size); }
      return;
    }
    if (seg === 'data') { errors.push({ line: ln, msg: 'Instructions go in the .text section. Add .text before your code.' }); return; }
    bind(TEXT_BASE + 4 * text.length);
    const im = /^(\S+)\s*(.*)$/.exec(line); const op = im[1].toLowerCase();
    let ops = im[2].replace(/\s*\(\s*/g, '(').replace(/\s*\)/g, ')').split(/[\s,]+/).filter(Boolean);
    text.push({ op, raw: ops, ln, src: line });
  });
  if (pending.length) bind(seg === 'data' ? DATA_BASE + dp : TEXT_BASE + 4 * text.length);
  // validate instructions
  for (const ins of text) {
    const { op, raw, ln } = ins;
    if (!(op in SPEC)) { errors.push({ line: ln, msg: HINT[op] || `Unknown instruction “${op}”.` }); continue; }
    let sig = SPEC[op];
    if (op === 'div' && raw.length === 3) sig = 'rrr';
    if (raw.includes('+')) { errors.push({ line: ln, msg: 'You can’t add inside an operand. For memory, write the offset outside the parentheses: 100($s0).' }); continue; }
    if (raw.length !== sig.length) {
      let msg = `${op} takes ${sig.length} operand${sig.length === 1 ? '' : 's'}; you gave ${raw.length}.`;
      if (sig === 'rrr' && raw.length > 3) msg += ' MIPS instructions have at most two sources. Split it into two instructions.';
      errors.push({ line: ln, msg }); continue;
    }
    const args = raw.map(t => classify(t, labels)); let bad = null;
    sig.split('').forEach((want, j) => {
      if (bad) return; const a = args[j];
      if (a.k === 'bad') { bad = a.msg; return; }
      const ok = want === a.k || (want === 'm' && a.k === 'l');
      if (ok) return;
      if (a.k === 'm' && want !== 'm') bad = `${op} can’t read memory. Only load/store instructions touch memory: lw the value into a register first.`;
      else if (want === 'r' && a.k === 'i') bad = sig === 'rrr' ? `${op} takes three registers. For a constant use ${op === 'sub' ? 'addi with a negative constant' : ['add', 'and', 'or', 'xor'].includes(op) ? op + 'i' : 'li to put it in a register first'}.` : `Operand ${j + 1} of ${op} must be a register.`;
      else if (want === 'i' && a.k === 'r') bad = op === 'li' ? 'li takes a register and a constant: li $t0, 5. To copy a register use move or add $d, $s, $zero.' : ['sll', 'srl', 'sra'].includes(op) ? `${op} shifts by a constant amount, e.g. ${op} $t0, $t1, 2.` : `${op} needs a constant as its last operand. With three registers use ${op.replace(/i$/, '').replace(/u$/, '')}.`;
      else if (want === 'm') bad = `${op} needs a memory operand like 8($t0) or ($t0).`;
      else if (want === 'l') bad = 'la needs a label from your .data section.';
      else bad = `Operand ${j + 1} of ${op} has the wrong kind.`;
    });
    if (bad) { errors.push({ line: ln, msg: bad }); continue; }
    for (const a of args) if (a.k === 'l' && labels[a.name] === undefined) { bad = `Label “${a.name}” isn’t defined.`; }
    if (['sll', 'srl', 'sra'].includes(op) && (args[2].v < 0 || args[2].v > 31)) bad = 'Shift amounts must be 0–31.';
    if (bad) { errors.push({ line: ln, msg: bad }); continue; }
    ins.args = args; ins.sig = sig;
  }
  return { text, data, labels, errors, dataEnd: dp };
}
class RunErr extends Error { constructor(line, msg) { super(msg); this.line = line; } }
function run(prog, init = {}, onStep) {
  const R = new Int32Array(32); R[28] = 0x10008000; R[29] = 0x7FFFEFFC | 0;
  for (const k in init) R[regIdx(k)] = init[k] | 0;
  let hi = 0, lo = 0; const mem = prog.data.slice(); const warns = [];
  const addrOf = a => { const addr = a.k === 'l' ? prog.labels[a.name] : (R[a.base] + a.off) >>> 0; return addr; };
  const idx = (addr, n, ln, op) => {
    if (addr % n) throw new RunErr(ln, `${op}: address ${hex(addr)} is not a multiple of ${n}. ${n === 4 ? 'Words must be word-aligned.' : 'Half-words must be 2-aligned.'}`);
    const i = addr - DATA_BASE; if (i < 0 || i + n > MEM_SIZE) throw new RunErr(ln, `${op}: address ${hex(addr)} is outside the data segment. Did you la the base address first?`); return i;
  };
  const ovf = (v, ln, op) => { if (v > 2147483647 || v < -2147483648) throw new RunErr(ln, `Arithmetic overflow in ${op}. ${op} traps on signed overflow (the u-version does not).`); return v | 0; };
  let steps = 0;
  for (const ins of prog.text) {
    if (++steps > 2000) throw new RunErr(ins.ln, 'Program ran more than 2000 steps. Check for an infinite loop.');
    const { op, args, ln } = ins; const a = args; const r = j => R[a[j].v]; let d = a[0] && a[0].k === 'r' ? a[0].v : -1; let val;
    switch (op) {
      case 'add': val = ovf(r(1) + r(2), ln, op); break;
      case 'addu': val = (r(1) + r(2)) | 0; break;
      case 'sub': val = ovf(r(1) - r(2), ln, op); break;
      case 'subu': val = (r(1) - r(2)) | 0; break;
      case 'addi': val = ovf(r(1) + (a[2].v | 0), ln, op); break;
      case 'addiu': val = (r(1) + a[2].v) | 0; break;
      case 'and': val = r(1) & r(2); break; case 'or': val = r(1) | r(2); break; case 'xor': val = r(1) ^ r(2); break; case 'nor': val = ~(r(1) | r(2)); break;
      case 'andi': case 'ori': case 'xori': { const im = a[2].v & 0xFFFF; val = op === 'andi' ? r(1) & im : op === 'ori' ? r(1) | im : r(1) ^ im; break; }
      case 'sll': val = r(1) << a[2].v; break; case 'srl': val = (r(1) >>> a[2].v) | 0; break; case 'sra': val = r(1) >> a[2].v; break;
      case 'slt': val = r(1) < r(2) ? 1 : 0; break;
      case 'not': val = ~r(1); break; case 'move': val = r(1); break;
      case 'li': val = a[1].v | 0; break;
      case 'la': val = prog.labels[a[1].name] | 0; break;
      case 'mul': case 'mult': case 'multu': {
        const x = op === 'multu' ? BigInt(r(op === 'mul' ? 1 : 0) >>> 0) : BigInt(r(op === 'mul' ? 1 : 0)), y = op === 'multu' ? BigInt(r(op === 'mul' ? 2 : 1) >>> 0) : BigInt(r(op === 'mul' ? 2 : 1));
        const p = x * y; lo = Number(BigInt.asIntN(32, p)); hi = Number(BigInt.asIntN(32, p >> 32n));
        if (op === 'mul') val = lo; else d = -1; break;
      }
      case 'div': case 'divu': {
        const three = a.length === 3; const x = three ? r(1) : r(0), y = three ? r(2) : r(1);
        if (y === 0) { warns.push(`Line ${ln}: division by zero. Hi and Lo are undefined.`); hi = lo = 0; }
        else if (op === 'divu') { lo = Math.floor((x >>> 0) / (y >>> 0)) | 0; hi = ((x >>> 0) % (y >>> 0)) | 0; }
        else { lo = Math.trunc(x / y) | 0; hi = (x % y) | 0; }
        if (three) val = lo; else d = -1; break;
      }
      case 'mfhi': val = hi; break; case 'mflo': val = lo; break;
      case 'lw': { const i = idx(addrOf(a[1]), 4, ln, op); val = mem[i] | mem[i + 1] << 8 | mem[i + 2] << 16 | mem[i + 3] << 24; break; }
      case 'lh': case 'lhu': { const i = idx(addrOf(a[1]), 2, ln, op); const h = mem[i] | mem[i + 1] << 8; val = op === 'lh' ? (h << 16) >> 16 : h; break; }
      case 'lb': case 'lbu': { const i = idx(addrOf(a[1]), 1, ln, op); val = op === 'lb' ? (mem[i] << 24) >> 24 : mem[i]; break; }
      case 'sw': case 'sh': case 'sb': { const n = { sw: 4, sh: 2, sb: 1 }[op]; const i = idx(addrOf(a[1]), n, ln, op); const v = r(0); for (let k = 0; k < n; k++) mem[i + k] = (v >>> (8 * k)) & 255; d = -1; break; }
      default: d = -1;
    }
    if (d > 0 && val !== undefined) R[d] = val | 0;
    if (d === 0 && val !== undefined) warns.push(`Line ${ln}: writing to $zero has no effect.`);
    if (onStep) onStep(ins, R, hi, lo, d);
  }
  return { R, hi, lo, mem, labels: prog.labels, warns };
}
const memWord = (res, addr) => { const i = addr - DATA_BASE; const m = res.mem; return (m[i] | m[i + 1] << 8 | m[i + 2] << 16 | m[i + 3] << 24) | 0; };
function traceComments(src, init) {
  const prog = assemble(src); const notes = {};
  const res = run(prog, init, (ins, R, hi, lo, d) => {
    if (d > 0) notes[ins.ln] = `${rn(d)} = ${R[d]} (${hex(R[d])})`;
    else if (['mult', 'multu', 'div', 'divu'].includes(ins.op)) notes[ins.ln] = `Hi = ${hi}, Lo = ${lo}`;
    else if (['sw', 'sh', 'sb'].includes(ins.op)) notes[ins.ln] = `stored low ${({ sw: 4, sh: 2, sb: 1 })[ins.op]} byte(s) of ${rn(ins.args[0].v)}`;
  });
  const lines = src.split('\n').map((l, i) => notes[i + 1] ? `${esc(l.padEnd(24))}<span class="c"># ${esc(notes[i + 1])}</span>` : esc(l));
  return { html: '<pre>' + lines.join('\n') + '</pre>', res };
}

export { REGS, DATA_BASE, regIdx, rn, assemble, run, memWord, traceComments };
