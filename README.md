# MIPS Drill

A practice tool for a computer organization course: binary arithmetic and MIPS assembly. Students write real MIPS in the browser, and a built-in assembler/simulator grades it against random test inputs, with plain-English feedback when something is wrong.

No backend, no build step, no dependencies. It is a static site: open it, practice, and progress is saved in the browser.

## Features

- **Write-the-code questions.** Students write MIPS (for example `A[10] = s1 + A[8]` or `s0 = t0*t0 + (t1 - 5) / t2`). The checker assembles it, runs it several times with random register values, and compares the result to a reference solution:
  > With $s1 = 2: expected $s2 = 25, but you got 7.
- **Mistakes explained, not just marked wrong.** The assembler recognizes common student errors:
  | Student writes | Message |
  |---|---|
  | `subi $s1, $s2, 10` | There is no subi. Use addi with a negative constant. |
  | `add $t0, $t1, 5` | add takes three registers. For a constant use addi. |
  | `sub $s0, $s1, 4($s2)` | Only load/store instructions touch memory. |
  | `lw $s1, 100 + $s0` | Write the offset outside the parentheses: 100($s0). |
  | `lw $t0, 2($t1)` (unaligned) | Address is not a multiple of 4. |
- **Generated questions.** Base conversion, 2's complement, sign extension, overflow, bitwise logic, endianness and "what is in `$t0` after this runs" traces are generated fresh each time, so students can't memorize answers. Trace answers show the register value after every line.
- **Three modes.** Mock quiz (mixed topics), topic drill, and an endless code lab.
- **Exam mode.** Feedback held until the end, with a timer and question navigator.
- **Review.** Results by topic, a review of every answer, and "retry missed".
- **Accessible and responsive.** Keyboard shortcuts, visible focus, light/dark theme, works on phones.

## Run it locally

ES modules need to be served over HTTP (opening `index.html` directly from disk won't load them):

```bash
python3 -m http.server 8000     # or: npm start
```

Then open http://localhost:8000.

## Tests

```bash
npm test        # Node 20+, no dependencies (uses node:test)
```

The tests check that:
- every question in the bank accepts its own answer, and every reference solution passes the code checker
- every question generator produces gradeable questions (300 runs each)
- the simulator matches MIPS/MARS behavior: Hi/Lo after `div`/`mult`, overflow traps on `add` but not `addu`, `andi` zero-extension, little-endian byte order, `lb` vs `lbu`, `.word` alignment, unaligned `lw`
- common mistakes produce the right error message
- a wrong answer is rejected with a concrete counterexample

GitHub Actions runs them on every push (`.github/workflows/test.yml`).

## How it works

Everything runs in the browser:

```
index.html ──► js/app.js        UI: home, quiz, results, review (DOM only)
                 │
                 ├─► js/grading.js    prepares questions, grades answers, builds explanations
                 │      │
                 ├─► js/questions.js  topics, question bank, question generators
                 │      │
                 └─► js/mips.js       MIPS assembler + simulator (no DOM; also used by tests)
                        │
                        └─► js/util.js   small helpers (random, formatting, localStorage)
```

| File | Responsibility |
|---|---|
| `js/mips.js` | **Assembler:** parses labels, `.data`/`.text`, directives (`.word .half .byte .ascii .asciiz .space .align`) and instructions, and validates operand types with targeted error messages. **Simulator:** 32 registers, Hi/Lo, 64 KB little-endian data segment at `0x10010000` (MARS layout), overflow traps, alignment checks. |
| `js/questions.js` | The question bank (multiple choice, select-all, numeric, match, order, write-the-code) and generator functions that build new questions with worked explanations. |
| `js/grading.js` | Turns a question into a playable one (shuffles options), grades each question type, and grades code by running the student's program and a reference program on the same random inputs. |
| `js/app.js` | Renders screens and handles input. Progress is stored per browser in `localStorage`. |

**Design choices**
- **Grading by execution, not text matching.** Any correct program passes, not just one specific answer.
- **No server.** Free to host, works offline, nothing to maintain, and no student data leaves the browser.
- **The simulator has no DOM code,** so the same file runs in the browser and in Node tests.

**Supported instructions:** `add addu sub subu addi addiu and or xor nor andi ori xori sll srl sra slt mult multu div divu mfhi mflo mul not move li la lw lh lhu lb lbu sw sh sb`. Branches and jumps aren't included yet because the course had not covered them at this point. The checker runs straight-line code.

## Adding a question

Questions are plain objects in `js/questions.js`. A write-the-code question:

```js
code('Write MIPS for <code>s1 = s2 % s3;</code>', {
  inputs: { $s2: () => rr(0, 200), $s3: () => rr(1, 12) },  // random test inputs
  outs: ['$s1'],                                            // registers to compare
  ref: 'div  $s2, $s3\nmfhi $s1',                           // reference solution
  exp: 'Remainder = Hi, quotient = Lo.'
}),
```

Run `npm test` afterwards. The tests confirm the reference solution passes its own checker.

## Deploying

It is just static files (`index.html`, `css/`, `js/`), so any web server works: a UBC department server, GitHub Pages, Netlify, or an Apache/nginx folder. Copy the files; there's nothing to build or configure.

## Roadmap

- Instructor review page for adding and editing questions
- Branches/jumps (`beq`, `bne`, `j`) and loops in the simulator
- Optional class sign-in (Canvas LTI) with anonymous, topic-level analytics for instructors

## Credits

Practice topics follow the course's lectures on the binary system and MIPS (Patterson & Hennessy, *Computer Organization and Design*). No course slides or materials are included. Built by Sheja Rubayi.
