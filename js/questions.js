import { ri, rr, pick, shuffle, esc, hex, hx, grp, bits } from './util.js';
import { regIdx, traceComments } from './mips.js';

/* ================= topics ================= */
const TOPICS = {
  units: 'Bits, bytes & units', conv: 'Base conversion', signed: 'Signed numbers', ops: 'Binary arithmetic & overflow', ascii: 'Characters (ASCII)',
  syntax: 'MIPS syntax & data', instr: 'Arithmetic & logical instructions', mem: 'Memory access & endianness', code: 'Write MIPS code'
};
const TOPIC_KEYS = Object.keys(TOPICS);

/* ================= question bank ================= */
const mc = (topic, q, opts, ans, exp, extra = {}) => ({ type: 'mc', topic, q, opts, ans, exp, ...extra });
const tf = (topic, q, ans, exp) => ({ type: 'mc', keep: true, two: true, topic, q, opts: ['True', 'False'], ans: ans ? 0 : 1, exp });
const multi = (topic, q, opts, ans, exp) => ({ type: 'multi', topic, q, opts, ans, exp });
const num = (topic, q, ans, base, exp, extra = {}) => ({ type: 'num', topic, q, ans, base, exp, ...extra });
const match = (topic, q, pairs, exp) => ({ type: 'match', topic, q, pairs, exp });
const order = (topic, q, steps, exp) => ({ type: 'order', topic, q, steps, exp });
const code = (q, o) => ({ type: 'code', topic: 'code', q, ...o });
const P = s => `<pre>${esc(s)}</pre>`;

const BANK = [
/* ---- units ---- */
mc('units', 'How many different values can replace the question marks in <code>1101 ????</code> (the left 4 bits stay fixed)?', ['16 (2⁴)', '4', '8', '256 (2⁸)'], 0, 'Only 4 bits are free, and each can be 0 or 1: 2⁴ = 16.'),
mc('units', 'What is 2²¹ bytes?', ['2 MB', '1 MB', '2 GB', '21 MB'], 0, '2²¹ = 2¹ × 2²⁰ = 2 × 1 MB.'),
mc('units', 'MIPS32 memory addresses are 32 bits long. What is the most memory it can address?', ['4 GB', '32 MB', '1 GB', '32 GB'], 0, '2³² bytes = 2² × 2³⁰ = 4 GB (that is 2³⁰ words).'),
num('units', 'How many bits are needed to give each of the 32 registers its own number?', 5, 10, '2⁵ = 32, so register numbers in an instruction are 5 bits.'),
mc('units', 'In MIPS32, a word is…', ['32 bits (4 bytes)', '16 bits (2 bytes)', '8 bits (1 byte)', '64 bits (8 bytes)'], 0, 'Registers, words and instructions are all 32 bits.'),

/* ---- conversion ---- */
mc('conv', 'What is the decimal value of <code>(100)</code>?', ['There’s no way to tell without the base', '4', '100', '256'], 0, 'In base 2 it is 4, in base 10 it is 100, in base 16 it is 256. Always check the base.'),
mc('conv', 'Which is 127 in binary?', ['0111 1111', '1000 0000', '1111 1111', '0111 1110'], 0, '127 = 128 − 1, so it is seven 1s.'),
mc('conv', 'Why does each hex digit map to exactly 4 bits?', ['2⁴ = 16, the number of hex symbols', 'Because a byte has 4 bits', 'Hex is base 4', 'It doesn’t; it varies'], 0, 'This is why hex ↔ binary is just grouping bits in fours.'),
mc('conv', 'When converting <code>111010</code> to hex, how do you group the bits?', ['In fours from the right, padding the left: 0011 1010 = 0x3A', 'In fours from the left: 1110 10 = 0xE2', 'In threes from the right', 'In eights from the right'], 0, 'Always group from the least significant (right) end.'),

/* ---- signed ---- */
match('signed', 'Match each representation (n bits) to its range.', [['Unsigned', '0 to 2ⁿ − 1'], ['Sign-magnitude', '−(2ⁿ⁻¹ − 1) to 2ⁿ⁻¹ − 1 (two zeros)'], ['2’s complement', '−2ⁿ⁻¹ to 2ⁿ⁻¹ − 1']], '1’s complement has the same range as sign-magnitude (and also two zeros).'),
multi('signed', 'Which representations have two zeros (+0 and −0)?', ['Sign-magnitude', '1’s complement', '2’s complement', 'Unsigned'], [0, 1], 'SM: 1000…0 is −0. 1’s: 1111…1 is −0. 2’s complement has only one zero.'),
mc('signed', '4-bit hex <code>0xA</code> (1010) is ___ unsigned, ___ in sign-magnitude, ___ in 1’s complement.', ['10, −2, −5', '10, −10, −1', '10, −10, −5', '10, −5, −2'], 0, 'Unsigned 8+2 = 10. SM: sign 1, magnitude 010 = 2 → −2. 1’s: invert 1010 → 0101 = 5 → −5.', { keep: true }),
mc('signed', 'Using 8-bit sign-magnitude, which is the smallest value?', ['0xFF', '0x83', '0x00', '0x3C'], 0, '0xFF = 1111 1111 → −127. 0x83 → −3. 0x3C → +60.'),
mc('signed', 'What is the range of 8-bit 2’s complement?', ['−128 to 127', '−127 to 127', '0 to 255', '−256 to 255'], 0, '−2⁷ to 2⁷ − 1.'),
mc('signed', 'Sign-extend the 2’s complement byte <code>0x93</code> to 16 bits.', ['0xFF93', '0x0093', '0x9300', '0x8093'], 0, '0x93 = 1001 0011, MSB is 1, so copy 1s into the new high byte.'),
mc('signed', 'Sign-extend the 2’s complement byte <code>0x51</code> to 16 bits.', ['0x0051', '0xFF51', '0x5100', '0x8051'], 0, '0x51 = 0101 0001, MSB is 0, so pad with 0s.'),
mc('signed', 'What is the minimum number of bits to represent +30 in 2’s complement?', ['6', '5', '4', '8'], 0, '30 = 11110 needs 5 bits, plus a 0 sign bit: 011110.'),
mc('signed', 'Shortcut to negate a 2’s complement number:', ['From the right, keep everything up to and including the first 1, then invert all bits to its left', 'Invert only the sign bit', 'Invert all bits (no +1)', 'Reverse the bit order'], 0, 'Same result as “invert all bits, then add 1”. Example: 0000 0101 → 1111 1011.'),
tf('signed', 'In 2’s complement, the most negative value (e.g. −128 in 8 bits) has no positive counterpart in the same number of bits.', true, 'The range is lopsided: −128 to +127. Negating 1000 0000 gives 1000 0000 again.'),

/* ---- ops ---- */
mc('ops', '4-bit 2’s complement: <code>0110 + 0100</code> (+6 + +4) gives…', ['1010, which is overflow (the result reads as −6)', '1010 = +10, no overflow', '0010 with a carry, no overflow', '1110 = −2'], 0, '+10 doesn’t fit in −8…7. P + P = N signals overflow.'),
mc('ops', '4-bit 2’s complement: is <code>0111 − 1011</code> an overflow?', ['Yes', 'No', 'Depends on the processor'], 0, '7 − (−5) = 12, which is outside −8…7. In sign terms, P − N = N.', { keep: true }),
match('ops', 'Match each pattern (P = positive, N = negative) to the result sign that means overflow.', [['P + P', 'Result is N'], ['N + N', 'Result is P'], ['P − N', 'Result is N'], ['N − P', 'Result is P']], 'Overflow = the result has the “impossible” sign.'),
tf('ops', 'Adding a positive and a negative number can never overflow.', true, 'The result lies between the two operands, so it always fits.'),
num('ops', 'What is <code>0110 &amp; 0101</code>? (4-bit answer in binary)', 0b0100, 2, 'AND is 1 only where both bits are 1.', { width: 4 }),
num('ops', 'What is <code>0110 | 0101</code>? (4-bit answer in binary)', 0b0111, 2, 'OR is 1 where either bit is 1.', { width: 4 }),
mc('ops', 'Shift-left-logical by 1 is the same as…', ['multiplying by 2, if the result still fits', 'dividing by 2', 'adding 1', 'negating'], 0, 'Shift left by k = × 2ᵏ. Shift right logical by k = integer ÷ 2ᵏ for unsigned values.'),
mc('ops', 'Multiplying an n-bit number by an m-bit number can need how many bits?', ['n + m', 'max(n, m)', 'n × m', '2 × max(n, m) + 1'], 0, 'That is why MIPS puts a 32 × 32 product into two registers, Hi and Lo (64 bits).'),
num('ops', 'Unsigned: <code>1000 × 1001</code> = ? (binary)', 0b1001000, 2, '8 × 9 = 72 = 1001000.'),
num('ops', 'Unsigned: <code>1001010 ÷ 1000</code>. What is the quotient? (binary)', 0b1001, 2, '74 ÷ 8 = 9 remainder 2. Quotient 1001, remainder 10.'),

/* ---- ascii ---- */
mc('ascii', 'How many bits does ASCII use, and how many characters does that give?', ['7 bits, 128 characters (stored in a byte)', '8 bits, 256 characters', '16 bits, 65,536 characters', '4 bits, 16 characters'], 0, 'Unicode (as presented) uses 16 bits: 2¹⁶ = 65,536 characters.'),
match('ascii', 'Match each character to its ASCII code.', [['NUL (null terminator)', '0x00'], ['\'0\'', '0x30'], ['\'A\'', '0x41'], ['\'a\'', '0x61']], 'Digits start at 0x30, capitals at 0x41, lowercase at 0x61.'),
mc('ascii', 'To turn an uppercase letter’s code into its lowercase code you…', ['add 0x20 (32)', 'subtract 0x20 (32)', 'add 0x30 (48)', 'subtract 0x41'], 0, '‘A’ = 0x41, ‘a’ = 0x61. They differ by 0x20.'),
mc('ascii', 'To turn an ASCII digit character (‘0’…‘9’) into its numeric value you…', ['subtract 0x30 (48)', 'subtract 0x20 (32)', 'subtract 0x37 (55)', 'add 0x30'], 0, '‘7’ = 0x37, and 0x37 − 0x30 = 7.'),
mc('ascii', 'To turn an ASCII hex letter ‘A’…‘F’ into its value 10…15 you…', ['subtract 0x37 (55)', 'subtract 0x30 (48)', 'subtract 0x41 (65)', 'subtract 0x20 (32)'], 0, '‘A’ = 0x41 = 65, and 65 − 55 = 10.'),

/* ---- syntax & data ---- */
mc('syntax', 'The register file has ___ registers, each ___ bytes, addressed with ___ bits.', ['32, 4, 5', '32, 32, 5', '32, 4, 32', '32, 32, 32'], 0, '32 registers × 32 bits (4 bytes); 2⁵ = 32 so 5 address bits.', { keep: true }),
match('syntax', 'Match each register group to its use.', [['$zero', 'Always 0'], ['$t0–$t9', 'Temporary values'], ['$s0–$s7', 'Saved values (your “variables”)'], ['$a0–$a3', 'Arguments to procedures'], ['$v0–$v1', 'Return values'], ['$at', 'Reserved for the assembler (don’t use)']], '$sp/$fp/$ra/$gp are for procedures and memory; $k0/$k1 are for the OS.'),
match('syntax', 'Match each data directive to what it stores.', [['.word', '32-bit integer(s), word-aligned'], ['.half', '16-bit value(s)'], ['.byte', '8-bit value(s)'], ['.ascii', 'String, no null terminator'], ['.asciiz', 'String plus a null (0x00) terminator'], ['.space n', 'n uninitialized bytes']], 'Directives start with a dot and are not turned into machine instructions.'),
mc('syntax', 'How many bits does <code>x: .half 20, 10</code> reserve?', ['32', '16', '20', '8'], 0, 'Two half-words × 16 bits = 32 bits.'),
mc('syntax', 'You need an uninitialized array of 5 integers. Which line?', ['arr: .space 20', 'arr: .space 5', 'arr: .word 5', 'arr: .byte 20'], 0, '.space counts bytes. 5 words × 4 bytes = 20. (.word 5 would store one integer with value 5.)'),
mc('syntax', 'What does <code>.align 2</code> do?', ['Aligns the next item to a 2² = 4-byte (word) boundary', 'Aligns to a 2-byte boundary', 'Inserts 2 bytes of padding', 'Aligns the next 2 items'], 0, '.align n means a 2ⁿ-byte boundary.'),
mc('syntax', 'MARS data starts at 0x10010000:<pre>a: .byte 1\nb: .word 5</pre>What is the address of <code>b</code>?', ['0x10010004', '0x10010001', '0x10010002', '0x10010008'], 0, 'a uses 1 byte (0x10010000). .word is auto-aligned to a multiple of 4, so 3 bytes are skipped and b is at 0x10010004.'),
mc('syntax', 'MARS data starts at 0x10010000:<pre>s: .asciiz "abc"\nn: .word 7</pre>What is the address of <code>n</code>?', ['0x10010004', '0x10010003', '0x10010005', '0x10010008'], 0, '"abc" + null = 4 bytes (0x10010000–03). The next word boundary is 0x10010004.'),
multi('syntax', 'Which labels are valid?', ['loop1', '_temp', 'Else', '2nd', 'my-label'], [0, 1, 2], 'Letters, digits and underscore, not starting with a digit. Labels are case sensitive (Else ≠ else).'),
mc('syntax', 'Which part of a program goes after <code>.data</code>?', ['Global data declarations (.word, .asciiz, .space…)', 'Instructions', 'Comments only', 'Register names'], 0, '.text = instructions (code). .data = variables/arrays in memory.'),

/* ---- instructions ---- */
mc('instr', 'Which instruction is INVALID?', ['addi $s0, $0, $0', 'addi $s0, $s1, 0', 'sub $s2, $t0, $t5', 'add $t0, $0, $t0'], 0, 'addi’s last operand must be a constant, not a register.'),
mc('instr', 'Which instruction is INVALID?', ['noti $s0, $s1, 2', 'ori $s0, $s1, 2', 'andi $s0, $s1, 2', 'sll $s0, $s1, 2'], 0, 'There is no noti. Use not (pseudo) or nor $d, $s, $zero. To flip some bits use xori.'),
mc('instr', 'Which loads −88 into $t0?', ['addi $t0, $zero, -88', 'li $t0, $0, -88', 'addi $t0, -88', 'sub $t0, $zero, -88'], 0, 'li $t0, -88 also works (pseudo). sub can’t take a constant.'),
mc('instr', 'C: <code>s0 = s1 + s2 + s3</code>. Correct MIPS?', ['add $s0, $s1, $s2  then  add $s0, $s0, $s3', 'add $s0, $s1, $s2, $s3', 'addi $s0, $s1, $s2, $s3', 'add $s0, $s1  then  add $s0, $s2, $s3'], 0, 'Every arithmetic instruction has exactly three operands: destination, source1, source2.'),
mc('instr', 'C: <code>s1 = s2 - 10</code>. Best MIPS?', ['addi $s1, $s2, -10', 'subi $s1, $s2, 10', 'sub $s1, $s2, 10', 'addi $s1, $s2, 10'], 0, 'There is no subi. Add a negative constant instead.'),
match('instr', 'Match each task to the instruction to use.', [['Put a constant in a register', 'li (or addi $d, $zero, k)'], ['Put a label’s address in a register', 'la'], ['Copy a word from memory into a register', 'lw'], ['Copy a register into memory', 'sw'], ['Get the low 32 bits of a product', 'mflo (after mult) or just mul'], ['Get a remainder', 'mfhi (after div)']], 'li = value, la = address, lw = what is AT an address.'),
mc('instr', 'After <code>div $s1, $s2</code>, where are the results?', ['Lo = quotient, Hi = remainder', 'Hi = quotient, Lo = remainder', '$s1 = quotient, $s2 = remainder', 'Lo = remainder, Hi = quotient'], 0, 'Get them with mflo (quotient) and mfhi (remainder). Memory trick: “Lo = the quotient you were looking for, Hi = what’s left over”.'),
mc('instr', 'After <code>mult $s1, $s2</code>, where is the 64-bit product?', ['Hi = upper 32 bits, Lo = lower 32 bits', 'Lo = upper, Hi = lower', 'All in $s1', 'In $v0 and $v1'], 0, 'If the product fits in 32 bits, mflo is all you need. mul $d, $s, $t does mult + mflo in one (pseudo).'),
mc('instr', 'Which value divided by 5 leaves Lo = 3 and Hi = 2?', ['17', '16', '15', '32'], 0, 'Lo = quotient 3, Hi = remainder 2: 5 × 3 + 2 = 17.'),
mc('instr', 'Fastest way to compute <code>$t1 = $t0 × 8</code>?', ['sll $t1, $t0, 3', 'srl $t1, $t0, 3', 'mul $t1, $t0, 3', 'sll $t1, $t0, 8'], 0, '8 = 2³, so shift left by 3.'),
mc('instr', 'Which instruction makes $s0 = 1 if $t1 is odd and 0 if even?', ['andi $s0, $t1, 1', 'ori $s0, $t1, 1', 'srl $s0, $t1, 1', 'xori $s0, $t1, 1'], 0, 'AND with a mask keeps only the bits you ask for. Bit 0 is the odd/even bit.'),
match('instr', 'Match each bit job to the logical instruction.', [['Keep some bits, clear the rest', 'andi / and with a mask'], ['Force some bits to 1', 'ori / or'], ['Flip some bits', 'xori / xor'], ['Flip all bits', 'not (or nor with $zero)'], ['Move bits toward the high end', 'sll'], ['Move bits toward the low end, fill with 0s', 'srl']], 'Masks: 1 bits in the mask mark the bits you act on.'),
mc('instr', 'Copy the right half (low 16 bits) of $t0 into $t1, with zeros in the left half.', ['andi $t1, $t0, 0xFFFF', 'ori $t1, $t0, 0xFFFF', 'srl $t1, $t0, 16', 'sll $t1, $t0, 16'], 0, 'andi zero-extends its 16-bit constant, so the mask is 0x0000FFFF.'),
mc('instr', 'Move the left half (high 16 bits) of $t0 into the right half of $t1, zeros on the left.', ['srl $t1, $t0, 16', 'sll $t1, $t0, 16', 'andi $t1, $t0, 0xFFFF', 'sra $t1, $t0, 16'], 0, 'srl fills with zeros. (sra would copy the sign bit.)'),
mc('instr', 'What is the difference between <code>add</code> and <code>addu</code>?', ['addu does not raise an overflow exception', 'addu only works on positive numbers', 'addu adds a constant', 'There is no difference at all'], 0, 'The “u” is a misnomer: both produce the same bits; only add traps on signed overflow.'),
mc('instr', 'What one C statement does this compute?<pre>add  $t0, $t1, $t2\nadd  $t0, $t3, $t0\nsub  $t0, $t0, $t4\naddi $t0, $t0, -10</pre>', ['t0 = t3 + t1 + t2 − t4 − 10', 't0 = t1 + t2 − t3 − t4 − 10', 't0 = t3 + t1 + t2 − t4 + 10', 't0 = (t1 + t2) × t3 − t4 − 10'], 0, 'Read top to bottom, always keeping t0 as the running total.'),
multi('instr', '$s0 = 0x70000000, $s1 = 0x80000000, $s2 = 0x90000000. Which instructions overflow?', ['add $t1, $s1, $s2', 'add $t0, $s0, $s1', 'sub $t2, $s1, $s2'], [0], '$s1 and $s2 are negative. N + N gives 0x10000000 (positive) → overflow. P + N and N − N never overflow.'),
multi('instr', 'Which of these are pseudo-instructions (the assembler turns them into real ones)?', ['li', 'la', 'mul', 'not', 'add', 'lw'], [0, 1, 2, 3], 'Pseudo-instructions are conveniences. add and lw are native MIPS.'),
mc('instr', 'Which addressing mode does <code>addi $t2, $t2, 4</code> use for the 4?', ['Immediate addressing', 'Register addressing', 'Base addressing', 'Memory addressing'], 0, 'Register: operands in registers (add). Immediate: constant inside the instruction (addi). Base: register + offset in memory (lw 8($s3)).'),

/* ---- memory ---- */
mc('mem', 'Which instructions can access memory?', ['Only load and store (lw, sw, lb, sb, …)', 'Any arithmetic instruction', 'add and sub only', 'Any instruction with a label'], 0, 'MIPS is a load/store architecture. Everything else works on registers.'),
mc('mem', 'Integer array A has its base address in $s2. Which loads A[8]?', ['lw $t0, 32($s2)', 'lw $t0, 8($s2)', 'lw $t0, 32(8)', 'la $t0, 32($s2)'], 0, 'Offset = index × 4 bytes. 8 × 4 = 32.'),
mc('mem', '$t0 holds 0x10000010. Which loads the word immediately <em>before</em> that address into $s2?', ['lw $s2, -4($t0)', 'lw $s2, -1($t0)', 'lw $t0, -4($s2)', 'lw $s2, 4($t0)'], 0, 'Negative offsets are fine. One word back = −4 bytes.'),
mc('mem', 'A 5-integer array starts at the address in $t0. Which loads the last element (index 4)?', ['lw $s2, 16($t0)', 'lw $s2, 20($t0)', 'lw $s2, 5($t0)', 'lw $s2, 4($t0)'], 0, 'Index 4 × 4 = 16. 20 would be one past the end.'),
order('mem', 'Put the steps for <code>s2 = A[i] - 5</code> in order (A base in $t0, i in $s1).', ['sll  $t1, $s1, 2      # t1 = 4*i', 'add  $t1, $t0, $t1   # t1 = address of A[i]', 'lw   $s2, 0($t1)     # s2 = A[i]', 'addi $s2, $s2, -5    # s2 = A[i] - 5'], 'A variable index needs the byte offset computed at run time: shift left by 2 (×4), add the base, then load.'),
mc('mem', 'Why can’t you write <code>lw $t2, $s1($t0)</code> when the index is in a register?', ['The offset must be a constant; compute base + 4*i into a register first', 'lw can’t use $t registers', 'Offsets must be positive', 'You must use la instead'], 0, 'Only constants go in front of the parentheses.'),
match('mem', 'la vs lw. Assume <code>A: .word 7</code> is at 0x10010000.', [['la $t0, A', '$t0 = 0x10010000 (the address)'], ['lw $t1, 0($t0)', '$t1 = 7 (the value stored there)'], ['li $t2, 7', '$t2 = 7 (a constant, no memory)']], 'You usually la the base address once, then lw/sw with offsets.'),
mc('mem', 'Which instruction is valid?', ['lw $s1, 100($s0)', 'lw $s1, 100 + $s0', 'sub $s0, $s1, 4($s2)', 'addi $s0, 8, -35'], 0, 'Arithmetic can’t read memory, addi’s first source must be a register, and offsets go outside the parentheses.'),
mc('mem', 'Memory byte = 0xF0. What does <code>lb</code> put in the register? And <code>lbu</code>?', ['lb: 0xFFFFFFF0, lbu: 0x000000F0', 'Both 0x000000F0', 'Both 0xFFFFFFF0', 'lb: 0x000000F0, lbu: 0xFFFFFFF0'], 0, 'lb/lh sign-extend; lbu/lhu zero-extend. Use lbu for characters and unsigned bytes.'),
mc('mem', 'What does <code>sb $t0, 0($t1)</code> store?', ['The lowest byte of $t0', 'The highest byte of $t0', 'All 4 bytes of $t0', 'The byte $t1 points to'], 0, 'sb stores the low-order byte; sh stores the low 2 bytes.'),
mc('mem', 'The word 0x11223344 is stored: 0x2000 = 11, 0x2001 = 22, 0x2002 = 33, 0x2003 = 44. Which endianness?', ['Big endian', 'Little endian'], 0, 'The big end (most significant byte, 11) sits at the word’s address.', { keep: true, two: true }),
mc('mem', '0x00113388 is stored at address 1000 on a little-endian machine. What byte is at 1002?', ['11', '00', '33', '88'], 0, 'Little endian: 1000 = 88, 1001 = 33, 1002 = 11, 1003 = 00.'),
tf('mem', 'MARS uses the endianness of the computer it runs on, so on a normal PC it is little endian.', true, 'Endianness matters when you access individual bytes of a word (lb/sb on a .word).'),
mc('mem', 'Why must <code>lw</code> addresses be multiples of 4?', ['Words are aligned; an unaligned lw raises an error', 'Because registers have 4 bits', 'Only for negative offsets', 'They don’t; any address works'], 0, 'Half-words (lh/sh) need multiples of 2; bytes can be anywhere.'),
mc('mem', 'Which memory segment holds your instructions, and which holds .data globals?', ['Text segment (0x00400000…) and static data segment (0x10000000…)', 'Stack and heap', 'Heap and text', 'Kernel and stack'], 0, 'The stack grows down from high memory; the heap grows up. They grow toward each other.'),

/* ---- code ---- */
code('Write MIPS for <code>s0 = (s1 + s2) - (s3 + s4);</code>', { inputs: { $s1: () => rr(-50, 50), $s2: () => rr(-50, 50), $s3: () => rr(-50, 50), $s4: () => rr(-50, 50) }, outs: ['$s0'],
  ref: 'add $t0, $s1, $s2   # t0 = s1 + s2\nadd $t1, $s3, $s4   # t1 = s3 + s4\nsub $s0, $t0, $t1   # s0 = t0 - t1', exp: 'Use temporaries for the two sums. Each instruction has one destination and two sources.' }),
code('Write MIPS for <code>s1 = s2 - 10;</code>', { inputs: { $s2: () => rr(-100, 100) }, outs: ['$s1'], forbid: ['li'],
  ref: 'addi $s1, $s2, -10', exp: 'No subi exists: add the negative constant.' }),
code('Write MIPS for <code>s0 = s1 + s2 + s3;</code>', { inputs: { $s1: () => rr(-50, 50), $s2: () => rr(-50, 50), $s3: () => rr(-50, 50) }, outs: ['$s0'],
  ref: 'add $s0, $s1, $s2\nadd $s0, $s0, $s3', exp: 'Two adds; reuse $s0 as the running total.' }),
code('Put <strong>−88</strong> into $t0, and <strong>0x3C4 + 1234</strong> into $s1.', { inputs: {}, outs: ['$t0', '$s1'],
  ref: 'addi $t0, $zero, -88      # or: li $t0, -88\nli   $t1, 0x3C4\naddi $s1, $t1, 1234', exp: 'Constants can be written in hex or decimal. ($s1 = 964 + 1234 = 2198.)' }),
code('Write MIPS for <code>s0 = t0*t0 + ((t1 - 5) / t2);</code> (integer division)', { inputs: { $t0: () => rr(-20, 20), $t1: () => rr(5, 80), $t2: () => rr(1, 9) }, outs: ['$s0'],
  ref: 'mult $t0, $t0       # Hi:Lo = t0*t0\nmflo $t3             # t3 = t0*t0\naddi $t4, $t1, -5   # t4 = t1 - 5\ndiv  $t4, $t2        # Lo = t4 / t2\nmflo $t5             # t5 = quotient\nadd  $s0, $t3, $t5', exp: 'mult/div put results in Hi/Lo; read them with mflo (product low half or quotient). mul $t3, $t0, $t0 is a fine shortcut.' }),
code('Write MIPS for <code>s1 = s2 % s3;</code> (remainder)', { inputs: { $s2: () => rr(0, 200), $s3: () => rr(1, 12) }, outs: ['$s1'],
  ref: 'div  $s2, $s3\nmfhi $s1     # remainder is in Hi', exp: 'Remainder = Hi, quotient = Lo.' }),
code('Write MIPS for <code>t1 = t2 &lt;&lt; 4;</code>', { inputs: { $t2: () => rr(0, 1000) }, outs: ['$t1'],
  ref: 'sll $t1, $t2, 4', exp: '<< is sll. (t1 = t2 × 16.)' }),
code('Set <code>s0 = 8 * s1</code> <strong>without</strong> mult or mul.', { inputs: { $s1: () => rr(-1000, 1000) }, outs: ['$s0'], forbid: ['mult', 'mul', 'multu'],
  ref: 'sll $s0, $s1, 3    # 8 = 2^3', exp: 'Multiplying by 2ᵏ is a left shift by k.' }),
code('Set <code>s0 = 10 * s1</code> <strong>without</strong> mult or mul.', { inputs: { $s1: () => rr(-1000, 1000) }, outs: ['$s0'], forbid: ['mult', 'mul', 'multu'],
  ref: 'sll $t0, $s1, 3    # 8*s1\nsll $t1, $s1, 1    # 2*s1\nadd $s0, $t0, $t1  # 10*s1', exp: '10 = 8 + 2, so add two shifts.' }),
code('Copy the right half (low 16 bits) of $t0 into the right half of $t1. The left half of $t1 must be 0s.', { inputs: { $t0: () => rr(-2147483648, 2147483647) }, outs: ['$t1'],
  ref: 'andi $t1, $t0, 0xFFFF', exp: 'andi zero-extends 0xFFFF to 0x0000FFFF, which is exactly the mask you want.' }),
code('Copy the left half (high 16 bits) of $t0 into the right half of $t1. The left half of $t1 must be 0s.', { inputs: { $t0: () => rr(-2147483648, 2147483647) }, outs: ['$t1'],
  ref: 'srl $t1, $t0, 16', exp: 'Shift right logical by 16 moves the top half down and fills with 0s.' }),
code('Set $s0 to 1 if $s1 is odd, 0 if it is even.', { inputs: { $s1: () => rr(-500, 500) }, outs: ['$s0'],
  ref: 'andi $s0, $s1, 1', exp: 'Bit 0 decides odd/even. (This even works for negative 2’s complement numbers.)' }),
code('Set bit 0 of $t1 to 1 (leave the other bits alone), result in $t0. Then flip every bit of $t1 into $t2.', { inputs: { $t1: () => rr(-100000, 100000) }, outs: ['$t0', '$t2'],
  ref: 'ori $t0, $t1, 1\nnot $t2, $t1     # or: nor $t2, $t1, $zero', exp: 'ori forces bits to 1; not/nor flips all bits.' }),
code('$a0 holds the ASCII code of a lowercase letter. Put the uppercase letter’s code in $v0.', { inputs: { $a0: () => rr(97, 122) }, outs: ['$v0'],
  ref: 'addi $v0, $a0, -32    # \'a\' - \'A\' = 0x20 = 32', exp: 'Lowercase − 0x20 = uppercase. (andi $v0, $a0, 0xDF also works: it clears bit 5.)' }),
code('$a0 holds an ASCII digit character (‘0’…‘9’). Put its numeric value in $v0.', { inputs: { $a0: () => rr(48, 57) }, outs: ['$v0'],
  ref: 'addi $v0, $a0, -48   # subtract 0x30', exp: '‘0’ = 0x30 = 48.' }),
code('C: <code>A[10] = s1 + A[8];</code> The base address of A is already in $s2 (set by the starter line).', { inputs: { $s1: () => rr(-50, 50) }, mem: [['A', 11]],
  starter: '.data\nA: .word 3, 9, 4, 7, 2, 8, 5, 6, 11, 1, 0\n.text\nla $s2, A          # base address of A\n# your code below\n',
  ref: '.data\nA: .word 3, 9, 4, 7, 2, 8, 5, 6, 11, 1, 0\n.text\nla  $s2, A\nlw  $t0, 32($s2)     # t0 = A[8]   (8*4)\nadd $t1, $s1, $t0    # t1 = s1 + A[8]\nsw  $t1, 40($s2)     # A[10] = t1 (10*4)', exp: 'Constant index → offset = index × 4. Load, compute in registers, store back.' }),
code('C: <code>s2 = A[i] - 5;</code> A’s base address is in $t0 (starter line) and <strong>i</strong> is in $s1.', { inputs: { $s1: () => rr(0, 4) }, outs: ['$s2'],
  starter: '.data\nA: .word 12, -4, 30, 7, 19\n.text\nla $t0, A          # base address of A\n# your code below\n',
  ref: '.data\nA: .word 12, -4, 30, 7, 19\n.text\nla   $t0, A\nsll  $t1, $s1, 2      # t1 = 4*i\nadd  $t1, $t0, $t1    # t1 = &A[i]\nlw   $s2, 0($t1)      # s2 = A[i]\naddi $s2, $s2, -5', exp: 'Variable index: shift i left by 2 (×4), add the base, then lw with offset 0.' }),
code('C: <code>B[3] = A[i];</code> with i in $s0. Use the arrays declared in the starter.', { inputs: { $s0: () => rr(0, 4) }, mem: [['B', 5]],
  starter: '.data\nA: .word 5, 2, -1, 3, 10\nB: .space 20\n.text\n# your code below\n',
  ref: '.data\nA: .word 5, 2, -1, 3, 10\nB: .space 20\n.text\nla  $t0, A          # base of A\nsll $t1, $s0, 2     # 4*i\nadd $t1, $t0, $t1   # &A[i]\nlw  $t2, 0($t1)     # t2 = A[i]\nla  $t3, B          # base of B\nsw  $t2, 12($t3)    # B[3] = t2 (3*4)', exp: 'You need la for each array’s base address. B[3] is a constant index, so offset 12.' }),
code('C: <code>A[2] = A[0] + A[1];</code> using the array in the starter.', { inputs: {}, mem: [['A', 3]],
  starter: '.data\nA: .word 23, 10, -15\n.text\n# your code below\n',
  ref: '.data\nA: .word 23, 10, -15\n.text\nla  $t0, A\nlw  $t1, 0($t0)     # A[0]\nlw  $t2, 4($t0)     # A[1]\nadd $t3, $t1, $t2\nsw  $t3, 8($t0)     # A[2]', exp: 'Offsets 0, 4, 8 for indices 0, 1, 2.' }),
code('Swap A[0] and A[1] in memory.', { inputs: {}, mem: [['A', 2]],
  starter: '.data\nA: .word 8, 3\n.text\n# your code below\n',
  ref: '.data\nA: .word 8, 3\n.text\nla $t0, A\nlw $t1, 0($t0)\nlw $t2, 4($t0)\nsw $t2, 0($t0)\nsw $t1, 4($t0)', exp: 'Load both into registers first, then store each into the other’s slot.' }),
code('Write MIPS for <code>t1 = ar[2] &lt;&lt; 4;</code> where ar’s base address is in $s0 (starter line).', { inputs: {}, outs: ['$t1'],
  starter: '.data\nar: .word 4, 9, 13, 2\n.text\nla $s0, ar         # base address of ar\n# your code below\n',
  ref: '.data\nar: .word 4, 9, 13, 2\n.text\nla  $s0, ar\nlw  $t2, 8($s0)     # ar[2]\nsll $t1, $t2, 4', exp: 'Load first (only lw touches memory), then shift.' }),
code('Uppercase the first character of the string in memory (it is lowercase). Store it back.', { inputs: {}, mem: [['str', 1, 1]],
  starter: '.data\nstr: .asciiz "hello"\n.text\n# your code below\n',
  ref: '.data\nstr: .asciiz "hello"\n.text\nla   $t0, str\nlbu  $t1, 0($t0)     # first char\naddi $t1, $t1, -32   # to uppercase\nsb   $t1, 0($t0)', exp: 'Characters are bytes: use lbu/sb, not lw/sw.' }),
code('Write the <code>.data</code> section only: <ul><li><code>x</code>: the integer 10</li><li><code>s</code>: the string "bbbb" with a null terminator</li><li><code>arr</code>: an integer array {10, 30, 50}</li><li><code>buf</code>: 3 uninitialized integers</li><li><code>y</code>: the integer 16</li></ul>', { inputs: {}, check: 'decl', starter: '.data\n',
  ref: '.data\nx:   .word 10\ns:   .asciiz "bbbb"\narr: .word 10, 30, 50\nbuf: .space 12\ny:   .word 16', exp: '.asciiz adds the null byte for you; .space counts bytes (3 × 4 = 12). The assembler aligns each .word automatically.' })
];

/* ================= generators ================= */
const toSigned = (u, n) => (u & (1 << (n - 1))) ? u - (1 << n) : u;
function genConv() {
  const t = ri(6);
  if (t === 0) { const v = rr(5, 300); const b = v.toString(2); const terms = [...b].map((c, i) => c === '1' ? 2 ** (b.length - 1 - i) : 0).filter(Boolean);
    return num('conv', `Convert to decimal: <code>(${grp(b)})₂</code>`, v, 10, `${terms.join(' + ')} = ${v}.`, { gen: true }); }
  if (t === 1) { const v = rr(5, 255); let rem = v; const used = []; for (let p = 128; p >= 1; p /= 2) if (rem >= p) { used.push(p); rem -= p; }
    return num('conv', `Convert to binary: <code>(${v})₁₀</code>`, v, 2, `${v} = ${used.join(' + ')} → ${grp(v.toString(2))}.`, { gen: true }); }
  if (t === 2) { const v = rr(17, 4095); const h = v.toString(16).toUpperCase();
    return num('conv', `Convert to binary: <code>0x${h}</code>`, v, 2, [...h].map(c => `${c} → ${parseInt(c, 16).toString(2).padStart(4, '0')}`).join(', ') + `. So ${grp(v.toString(2).padStart(h.length * 4, '0'))}.`, { gen: true }); }
  if (t === 3) { const v = rr(17, 4095); const b = v.toString(2); const pad = b.padStart(Math.ceil(b.length / 4) * 4, '0');
    return num('conv', `Convert to hex: <code>(${b})₂</code>`, v, 16, `Group in fours from the right: ${grp(pad)} → ${hx(v)}.`, { gen: true }); }
  if (t === 4) { const v = rr(16, 4095); const h = v.toString(16).toUpperCase();
    return num('conv', `Convert to decimal: <code>0x${h}</code>`, v, 10, [...h].map((c, i) => `${parseInt(c, 16)}×16${['⁰', '¹', '²', '³'][h.length - 1 - i]}`).join(' + ') + ` = ${v}.`, { gen: true }); }
  const v = rr(20, 1000); let q = v; const steps = []; while (q) { steps.push(`${q} ÷ 16 = ${Math.floor(q / 16)} r ${q % 16}`); q = Math.floor(q / 16); }
  return num('conv', `Convert to hex: <code>(${v})₁₀</code>`, v, 16, `${steps.join('; ')}. Read remainders bottom-up: ${hx(v)}.`, { gen: true });
}
const SCHEMES = { u: 'unsigned', sm: 'sign-magnitude', one: '1’s complement', two: '2’s complement' };
function valueIn(u, n, s) {
  const msb = (u >> (n - 1)) & 1, mask = (1 << n) - 1;
  if (s === 'u' || !msb) return u;
  if (s === 'sm') return -(u & (mask >> 1));
  if (s === 'one') return -((~u) & mask);
  return u - (1 << n);
}
function genSigned() {
  const t = ri(7);
  if (t <= 1) { const n = pick([4, 8, 8]); const u = rr(1 << (n - 1), (1 << n) - 1) ^ (Math.random() < 0.2 ? 1 << (n - 1) : 0); const s = pick(['sm', 'one', 'two', 'two']); const v = valueIn(u, n, s);
    const show = n === 8 && Math.random() < 0.4 ? `<code>${hex(u, 2)}</code> (${bits(u, 8)})` : `<code>${bits(u, n)}</code>`;
    const msb = (u >> (n - 1)) & 1;
    const how = !msb ? 'MSB is 0, so it is positive: read it as unsigned.' : s === 'sm' ? `MSB 1 = negative; the other bits ${bits(u & ((1 << (n - 1)) - 1), n - 1)} give the magnitude.` : s === 'one' ? `MSB 1 = negative. Invert all bits: ${bits(~u, n)} = ${(~u) & ((1 << n) - 1)}.` : `MSB 1 = negative. Invert and add 1: ${bits(-u, n)} = ${(-u) & ((1 << n) - 1)}.`;
    return num('signed', `${n}-bit ${show} in <strong>${SCHEMES[s]}</strong>. What is its decimal value?`, v, 10, `${how} Value: ${v}.`, { gen: true }); }
  if (t === 2) { const s = pick(['sm', 'one', 'two', 'two']); const v = rr(-127, -1); const m = -v;
    const u = s === 'sm' ? 0x80 | m : s === 'one' ? (~m) & 255 : v & 255;
    return num('signed', `Write <strong>${v}</strong> in 8-bit <strong>${SCHEMES[s]}</strong> (binary, all 8 bits).`, u, 2, `+${m} = ${bits(m, 8)}. ${s === 'sm' ? 'Set the sign bit' : s === 'one' ? 'Invert every bit' : 'Invert every bit, then add 1'} → ${bits(u, 8)}.`, { gen: true, width: 8 }); }
  if (t === 3) { const u = rr(0, 255); const ext = (u & 0x80) ? 0xFF00 | u : u;
    return num('signed', `Sign-extend the 2’s complement byte <code>${hex(u, 2)}</code> to 16 bits (hex, 4 digits).`, ext, 16, `${hex(u, 2)} = ${bits(u, 8)}; the MSB is ${u >> 7}, so the new high byte is ${u & 0x80 ? 'FF' : '00'}: ${hex(ext, 4)}.`, { gen: true, width: 4 }); }
  if (t === 4) { const v = rr(-127, 127) || 5; const u = v & 255, ng = (-v) & 255;
    return num('signed', `Negate the 8-bit 2’s complement number <code>${bits(u, 8)}</code> (${v}). Answer in binary, 8 bits.`, ng, 2, `Invert: ${bits(~u, 8)}, then add 1: ${bits(ng, 8)} (= ${-v}).`, { gen: true, width: 8 }); }
  if (t === 5) { const v = (Math.random() < 0.5 ? -1 : 1) * rr(1, 200); let n = 1; while (!(v >= -(2 ** (n - 1)) && v <= 2 ** (n - 1) - 1)) n++;
    return num('signed', `Minimum number of bits to represent <strong>${v}</strong> in 2’s complement?`, n, 10, `${n} bits cover −${2 ** (n - 1)} to ${2 ** (n - 1) - 1}; ${n - 1} bits only reach −${2 ** (n - 2)} to ${2 ** (n - 2) - 1}.`, { gen: true }); }
  const n = pick([4, 6, 8, 16]); const s = pick(['u', 'sm', 'one', 'two']); const H = 2 ** (n - 1);
  const opts = [`−${H} to ${H - 1}`, `−${H - 1} to ${H - 1}`, `0 to ${2 ** n - 1}`, `−${2 ** n} to ${2 ** n - 1}`];
  return mc('signed', `What is the range of a ${n}-bit number in <strong>${SCHEMES[s]}</strong>?`, opts, { two: 0, sm: 1, one: 1, u: 2 }[s], 'Unsigned 0…2ⁿ−1. Sign-magnitude and 1’s complement −(2ⁿ⁻¹−1)…2ⁿ⁻¹−1 (two zeros). 2’s complement −2ⁿ⁻¹…2ⁿ⁻¹−1.', { gen: true, keep: true });
}
function genOps() {
  const t = ri(5);
  if (t <= 1) { const n = pick([4, 8]); const H = 2 ** (n - 1); const a = rr(-H, H - 1), b = rr(-H, H - 1); const sub = Math.random() < 0.4;
    const real = sub ? a - b : a + b; const ov = real < -H || real > H - 1; const res = toSigned(real & ((1 << n) - 1), n);
    const sg = x => x < 0 ? 'N' : 'P';
    return mc('ops', `${n}-bit 2’s complement: <code>${bits(a, n)} ${sub ? '−' : '+'} ${bits(b, n)}</code>. Overflow?`, ['No overflow', 'Overflow'], ov ? 1 : 0,
      `${a} ${sub ? '−' : '+'} ${b} = ${real}; ${n} bits hold −${H}…${H - 1}. The ${n}-bit result is ${bits(real, n)} = ${res}. Signs: ${sg(a)} ${sub ? '−' : '+'} ${sg(b)} = ${sg(res)}${ov ? ' → wrong sign, overflow.' : '.'}`, { gen: true, keep: true, two: true }); }
  if (t === 2) { const a = rr(0, 255), b = rr(0, 255); const op = pick(['&', '|', '^', 'nor']); const v = op === '&' ? a & b : op === '|' ? a | b : op === '^' ? a ^ b : ~(a | b) & 255;
    return num('ops', `8 bits: <code>${bits(a, 8)} ${op === 'nor' ? 'NOR' : op === '^' ? 'XOR' : op} ${bits(b, 8)}</code> = ? (binary, 8 bits)`, v, 2, `${{ '&': 'AND: 1 only where both are 1', '|': 'OR: 1 where either is 1', '^': 'XOR: 1 where they differ', nor: 'NOR: OR, then invert' }[op]}. Result ${bits(v, 8)}.`, { gen: true, width: 8 }); }
  if (t === 3) { const a = rr(1, 255), k = rr(1, 3); const left = Math.random() < 0.5; const v = left ? (a << k) & 255 : a >> k;
    return num('ops', `8 bits: <code>${left ? 'sll' : 'srl'}</code> <code>${bits(a, 8)}</code> by ${k} = ? (binary, 8 bits)`, v, 2, `${left ? `Shift left ${k}, fill 0s on the right${(a << k) > 255 ? '; bits fell off the top, so it is no longer ' + a + '×' + 2 ** k : ': ' + a + ' × ' + 2 ** k + ' = ' + v}` : `Shift right ${k}, fill 0s on the left: ${a} ÷ ${2 ** k} = ${v} (integer division)`}. Result ${bits(v, 8)}.`, { gen: true, width: 8 }); }
  const a = rr(0, 127), b = rr(0, 127); const v = (a + b) & 255;
  return num('ops', `Add in 8 bits: <code>${bits(a, 8)} + ${bits(b, 8)}</code> = ? (binary, 8 bits)`, v, 2, `${a} + ${b} = ${a + b} → ${bits(v, 8)}${a + b > 127 ? '. As 2’s complement that is negative: P + P = N, overflow.' : '.'}`, { gen: true, width: 8 });
}
function genUnits() {
  const t = ri(3);
  if (t === 0) { const k = rr(10, 34); const [u, base] = k >= 30 ? ['GB', 30] : k >= 20 ? ['MB', 20] : ['KB', 10];
    return num('units', `How many ${u} is 2<sup>${k}</sup> bytes?`, 2 ** (k - base), 10, `1 ${u} = 2<sup>${base}</sup> bytes, so 2<sup>${k}</sup> / 2<sup>${base}</sup> = 2<sup>${k - base}</sup> = ${2 ** (k - base)}.`, { gen: true }); }
  if (t === 1) { const n = rr(3, 12); return num('units', `How many different values can ${n} bits represent?`, 2 ** n, 10, `2<sup>${n}</sup> = ${2 ** n}.`, { gen: true }); }
  const N = rr(5, 600); const b = Math.ceil(Math.log2(N));
  return num('units', `What is the minimum number of bits to give ${N} different items each a unique code?`, b, 10, `2<sup>${b - 1}</sup> = ${2 ** (b - 1)} is too few; 2<sup>${b}</sup> = ${2 ** b} is enough.`, { gen: true });
}
function genAscii() {
  const t = ri(4);
  const ch = pick([...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789']); const c = ch.charCodeAt(0);
  const base = /[A-Z]/.test(ch) ? ["'A'", 0x41] : /[a-z]/.test(ch) ? ["'a'", 0x61] : ["'0'", 0x30];
  if (t <= 1) return num('ascii', `What is the ASCII code of <code>'${ch}'</code>? (hex)`, c, 16, `${base[0]} = ${hx(base[1])}; ${ch} is ${c - base[1]} after it: ${hx(c)}.`, { gen: true });
  if (t === 2) { const opts = shuffle([ch, ...new Set([ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase(), String.fromCharCode(c + 1), String.fromCharCode(c - 1), String.fromCharCode(c ^ 0x10)])].filter((x, i, a) => a.indexOf(x) === i && /[ -~]/.test(x)).slice(0, 4));
    return mc('ascii', `Which character has ASCII code <code>${hx(c)}</code>?`, opts.map(o => `<code>'${esc(o)}'</code>`), opts.indexOf(ch), `${base[0]} = ${hx(base[1])}, and ${hx(c)} is ${c - base[1]} further.`, { gen: true, keep: true }); }
  const L = pick([...'abcdefghijklmnopqrstuvwxyz']); const up = Math.random() < 0.5;
  const from = up ? L : L.toUpperCase(), to = up ? L.toUpperCase() : L;
  return num('ascii', `To turn <code>'${from}'</code> (${hx(from.charCodeAt(0))}) into <code>'${to}'</code>, what do you ${up ? 'subtract' : 'add'}? (hex or decimal)`, 32, 10, `Upper and lower case differ by 0x20 = 32: ${hx(from.charCodeAt(0))} ${up ? '−' : '+'} 0x20 = ${hx(to.charCodeAt(0))}.`, { gen: true, any: true });
}
const T_REGS = ['$t0', '$t1', '$t2', '$t3', '$s0', '$s1'];
function traceQ(topic, src, target, extra = '') {
  const { html, res } = traceComments(src, {});
  const v = res.R[regIdx(target)];
  return num(topic, `${extra}What is in <code>${target}</code> after this runs? (decimal or hex)${P(src)}`, v, 10, 'Line by line:' + html, { gen: true, any: true, s32: true });
}
function genTrace() {
  const t = ri(5);
  if (t === 0) { const a = rr(-20, 40), b = rr(-20, 40); const lines = [`li   $t1, ${a}`, `li   $t2, ${b}`]; const live = ['$t1', '$t2']; let last;
    for (let k = 0; k < rr(2, 3); k++) { const d = pick(['$t0', '$t3', '$s0']); const x = pick(live), y = pick(live);
      const op = pick(['add', 'sub', 'addi', 'sll']); lines.push(op === 'addi' ? `addi ${d}, ${x}, ${rr(-15, 15)}` : op === 'sll' ? `sll  ${d}, ${x}, ${rr(1, 3)}` : `${op}  ${d}, ${x}, ${y}`); if (!live.includes(d)) live.push(d); last = d; }
    return traceQ('instr', lines.join('\n'), last); }
  if (t === 1) { const a = rr(1, 255), b = rr(1, 255); const op = pick(['and', 'or', 'xor', 'nor', 'andi', 'ori', 'xori', 'sll', 'srl']);
    const line = ['andi', 'ori', 'xori'].includes(op) ? `${op} $t0, $t1, 0x${rr(1, 255).toString(16).toUpperCase()}` : ['sll', 'srl'].includes(op) ? `${op}  $t0, $t1, ${rr(1, 4)}` : `${op}  $t0, $t1, $t2`;
    return traceQ('instr', `li   $t1, 0x${a.toString(16).toUpperCase()}\nli   $t2, 0x${b.toString(16).toUpperCase()}\n${line}`, '$t0'); }
  if (t === 2) { const a = rr(10, 120), b = rr(2, 12); const md = pick(['mult', 'div', 'div']); const g = pick(['mfhi', 'mflo']);
    return traceQ('instr', `li   $t1, ${a}\nli   $t2, ${b}\n${md} $t1, $t2\n${g} $t0`, '$t0'); }
  if (t === 3) { const arr = Array.from({ length: 5 }, () => rr(-30, 90)); const k = rr(0, 4), j = rr(0, 3);
    const v = pick([0, 1]);
    const src = v ? `.data\narr: .word ${arr.join(', ')}\n.text\nla   $t0, arr\nlw   $t1, ${4 * k}($t0)\naddi $t0, $t0, 4\nlw   $t2, ${4 * j}($t0)\nadd  $s0, $t1, $t2`
      : `.data\narr: .word ${arr.join(', ')}\n.text\nla   $t0, arr\nli   $t1, ${rr(1, 50)}\nsw   $t1, ${4 * k}($t0)\nlw   $s0, ${4 * k}($t0)\nlw   $t2, ${4 * j}($t0)\nsub  $s0, $s0, $t2`;
    return traceQ('mem', src, '$s0'); }
  const w = (rr(0, 255) << 24 | rr(0, 255) << 16 | rr(128, 255) << 8 | rr(0, 255)) >>> 0; const off = rr(0, 3); const op = pick(['lb', 'lbu', 'lb']);
  return traceQ('mem', `.data\nw: .word ${hx(w)}\n.text\nla   $t1, w\n${op}  $t0, ${off}($t1)`, '$t0', 'MARS is little endian. ');
}
function genEndian() {
  const w = (rr(1, 255) << 24 | rr(0, 255) << 16 | rr(0, 255) << 8 | rr(0, 255)) >>> 0; const little = Math.random() < 0.6; const k = rr(0, 3);
  const bytes = [24, 16, 8, 0].map(s => (w >>> s) & 255); const at = little ? bytes[3 - k] : bytes[k];
  const lay = (little ? [...bytes].reverse() : bytes).map((b, i) => `0x${(0x2000 + i).toString(16).toUpperCase()}: ${b.toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
  return num('mem', `The word <code>${hex(w)}</code> is stored at 0x2000 on a <strong>${little ? 'little' : 'big'}-endian</strong> machine. Which byte is at <code>0x${(0x2000 + k).toString(16).toUpperCase()}</code>? (hex)`, at, 16,
    `${little ? 'Little endian puts the least significant byte at the lowest address' : 'Big endian puts the most significant byte at the lowest address'}: ${lay}.`, { gen: true });
}
const GEN = { conv: [genConv], signed: [genSigned], ops: [genOps], units: [genUnits], ascii: [genAscii], instr: [genTrace], mem: [genTrace, genEndian] };

export { TOPICS, TOPIC_KEYS, mc, multi, num, match, order, code, P, BANK, genTrace, genEndian, GEN };
