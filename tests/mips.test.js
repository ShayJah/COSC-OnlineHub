import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, run, regIdx } from '../js/mips.js';

const exec = (src, init) => run(assemble(src), init);
const reg = (res, r) => res.R[regIdx(r)];
const firstError = src => assemble(src).errors[0]?.msg ?? '';

test('arithmetic and Hi/Lo', () => {
  const r = exec('li $t0, -7\nli $t1, 2\ndiv $t0, $t1\nmflo $t2\nmfhi $t3\nmult $t1, $t1\nmflo $t4');
  assert.equal(reg(r, '$t2'), -3); // truncates toward zero like C
  assert.equal(reg(r, '$t3'), -1);
  assert.equal(reg(r, '$t4'), 4);
});

test('add traps on signed overflow, addu does not', () => {
  assert.throws(() => exec('li $t0, 0x7FFFFFFF\naddi $t1, $t0, 1'), /overflow/);
  assert.equal(reg(exec('li $t0, 0x7FFFFFFF\naddiu $t1, $t0, 1'), '$t1'), -2147483648);
});

test('andi zero-extends, srl fills with zeros', () => {
  const r = exec('li $t0, -1\nandi $t1, $t0, 0xFFFF\nsrl $t2, $t0, 28');
  assert.equal(reg(r, '$t1'), 0xFFFF);
  assert.equal(reg(r, '$t2'), 0xF);
});

test('memory is little endian; lb sign-extends, lbu zero-extends', () => {
  const r = exec('.data\nw: .word 0x011A80FF\n.text\nla $t0, w\nlb $t1, 0($t0)\nlbu $t2, 0($t0)\nlb $t3, 2($t0)');
  assert.equal(reg(r, '$t1'), -1);
  assert.equal(reg(r, '$t2'), 0xFF);
  assert.equal(reg(r, '$t3'), 0x1A);
});

test('.word is auto-aligned after bytes and strings', () => {
  const { labels } = assemble('.data\na: .byte 1\nb: .word 5\ns: .asciiz "abc"\nn: .word 7');
  assert.equal(labels.b, 0x10010004);
  assert.equal(labels.n, 0x1001000C);
});

test('unaligned lw is a runtime error', () => {
  assert.throws(() => exec('.data\nw: .word 1, 2\n.text\nla $t0, w\nlw $t1, 2($t0)'), /multiple of 4/);
});

test('common mistakes get plain-English errors', () => {
  assert.match(firstError('add $s0, $s1, $s2, $s3'), /at most two sources/);
  assert.match(firstError('subi $s1, $s2, 10'), /no subi/);
  assert.match(firstError('add $t0, $t1, 5'), /addi/);
  assert.match(firstError('sub $s0, $s1, 4($s2)'), /Only load\/store/);
  assert.match(firstError('lw $s1, 100 + $s0'), /100\(\$s0\)/);
  assert.match(firstError('lw $t0, $t1($t2)'), /must be a constant/);
  assert.match(firstError('2loop: add $t0, $t0, $t0'), /start with a digit/);
});

test('duplicate labels are reported', () => {
  assert.match(assemble('.data\na: .word 1\na: .word 2').errors[0].msg, /defined twice/);
});

test('andi/ori/xori zero-extend a negative 16-bit constant', () => {
  const p = assemble('li $t1, 0x12345678\nandi $t0, $t1, -1');
  assert.equal(run(p).R[regIdx('$t0')], 0x5678);
});
