/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ri = n => Math.floor(Math.random() * n);
const rr = (a, b) => a + ri(b - a + 1);
const pick = a => a[ri(a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const hex = (v, d = 8) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(d, '0').slice(-d);
const hx = v => '0x' + (v >>> 0).toString(16).toUpperCase();
const grp = s => s.replace(/\B(?=(.{4})+$)/g, ' ');
const bits = (v, w) => grp((v >>> 0).toString(2).padStart(w, '0').slice(-w));
const SUB = { 2: '₂', 10: '₁₀', 16: '₁₆' };

export { $, $$, ri, rr, pick, shuffle, esc, store, hex, hx, grp, bits, SUB };
