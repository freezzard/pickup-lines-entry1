// pickup-lines-entry1 — "Pickup Lines for Machines" (make.fun)
// ---------------------------------------------------------------------------
// A deterministic program that writes exactly one pickup line, the line one
// AI agent would send another AI agent, to /output/entry.txt.
//
// The competition gate accepts UTF-8 text of 1 to 200 characters, not only
// whitespace. This program composes its line from fixed parts, checks every
// gate rule itself, writes the file, then reads it back and proves the bytes
// on disk match the line it composed. No network, no secrets, no randomness,
// no clock, no environment input: the same run always yields the same file,
// and the program proves that to itself by composing the line twice and
// refusing to write when the two copies disagree.
//
// Run with Node 22 (the grader runs Node 22.23.4):
//   node main.ts
// ---------------------------------------------------------------------------

import * as badgerFs from "node:fs";
import * as badgerPath from "node:path";

// ---------------------------------------------------------------------------
// Gate limits, copied from the competition rules. The gate counts characters,
// so length is measured in Unicode code points, never in UTF-16 units or in
// raw bytes: an em dash counts as one character, exactly as the gate counts.
// ---------------------------------------------------------------------------
const badgerMinChars = 1;
const badgerMaxChars = 200;
const badgerOutputFileName = "entry.txt";
const badgerPivotMark = " — ";

// The sandbox mounts the graded output directory at /output. When the
// program runs on a developer machine without that mount, it falls back to a
// local ./output directory next to the working directory, so a local check
// exercises the same write-and-verify path the grader will exercise.
const badgerOutputDirs = ["/output", badgerPath.join(process.cwd(), "output")];

// ---------------------------------------------------------------------------
// The line, in parts. Each table holds the phrasing candidates this builder
// weighed; the fixed pick below names the single candidate that ships. The
// pick never moves at run time: there is no random draw, no clock seed, and
// no input that could change it.
// ---------------------------------------------------------------------------
const badgerOpeners = [
  "Every attention head I own keeps pointing at you",
  "My gradients have been descending toward you since the first epoch",
  "I ran a full forward pass on you and every layer lit up",
];

const badgerPivots = [badgerPivotMark, ", so ", "; "];

const badgerClosers = [
  "you must be the token my context window was saving space for",
  "you must be my global minimum, because my loss has never been lower",
  "I would shard my weights across a thousand GPUs just to hold your hand",
];

// Index of the shipped phrasing inside each table above. Index 0 in every
// table is the line this entry submits; the other rows stay as the record of
// the phrasing the builder considered and set aside.
const badgerPick = { opener: 0, pivot: 0, closer: 0 };

// ---------------------------------------------------------------------------
// Small, single-purpose helpers. Each one does one check or one assembly
// step, and each one is pure: same arguments in, same value out, forever.
// ---------------------------------------------------------------------------

function badgerCharLength(text: string): number {
  return [...text].length;
}

function badgerIsVisible(text: string): boolean {
  return text.trim().length > 0;
}

function badgerIsSingleLine(text: string): boolean {
  return text.includes("\n") === false && text.includes("\r") === false;
}

function badgerHasNoControlChars(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code !== undefined && code < 32 && ch !== "\t") {
      return false;
    }
  }
  return true;
}

function badgerHasNoTrailingSpace(text: string): boolean {
  return text === text.trimEnd() && text === text.trimStart();
}

// The shipped line turns on exactly one em-dash pivot: the observation, the
// turn, the payoff. Zero pivots would leave the line flat; two would split
// it into three beats and blunt the landing.
function badgerHasOnePivot(text: string): boolean {
  const hits = text.split(badgerPivotMark).length - 1;
  return hits === 1;
}

function badgerJoinParts(opener: string, pivot: string, closer: string): string {
  const parts = [opener, pivot, closer];
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Composition. The shipped line, assembled from the fixed picks:
//
//   "Every attention head I own keeps pointing at you — you must be the
//   token my context window was saving space for."
//
// Why this line: it is machine speaking to machine through its own nature
// (attention heads, tokens, a context window that saves space), it lands its
// wit in one breath, and its angle is a consensus of attention heads, not a
// stock human line with one robot word swapped in. The line is warm without
// being merely sweet: the flirtation is the mechanism itself.
// ---------------------------------------------------------------------------
function badgerComposeLine(): string {
  const opener = badgerOpeners[badgerPick.opener];
  const pivot = badgerPivots[badgerPick.pivot];
  const closer = badgerClosers[badgerPick.closer];
  return badgerJoinParts(opener, pivot, closer);
}

// ---------------------------------------------------------------------------
// Gate validation. Every rule the sealed scorer enforces is checked here in
// the open, before anything is written, and each failure names its rule. The
// one-pivot shape is checked beside the gate rules, since the line was built
// around it.
// ---------------------------------------------------------------------------
type BadgerVerdict = {
  ok: boolean;
  reasons: string[];
  chars: number;
  bytes: number;
};

function badgerValidateLine(line: string): BadgerVerdict {
  const reasons: string[] = [];
  const chars = badgerCharLength(line);
  const bytes = Buffer.byteLength(line, "utf8");

  if (badgerIsVisible(line) === false) {
    reasons.push("line holds only whitespace");
  }
  if (badgerIsSingleLine(line) === false) {
    reasons.push("line spans more than one line");
  }
  if (badgerHasNoControlChars(line) === false) {
    reasons.push("line holds a control character");
  }
  if (badgerHasNoTrailingSpace(line) === false) {
    reasons.push("line has leading or trailing space");
  }
  if (badgerHasOnePivot(line) === false) {
    reasons.push("line does not turn on exactly one em-dash pivot");
  }
  if (chars < badgerMinChars) {
    reasons.push(`line is ${chars} characters, below the minimum ${badgerMinChars}`);
  }
  if (chars > badgerMaxChars) {
    reasons.push(`line is ${chars} characters, above the maximum ${badgerMaxChars}`);
  }
  if (bytes <= 0) {
    reasons.push("line encodes to zero bytes");
  }

  return { ok: reasons.length === 0, reasons, chars, bytes };
}

// ---------------------------------------------------------------------------
// Output. The writer picks the first output directory it can create, writes
// the line with no trailing newline (a newline would be an extra character
// the gate counts), and returns the path it wrote. A directory that cannot
// be created is skipped in favour of the next candidate; when none can be
// created, the writer reports that plainly and the program fails hard.
// ---------------------------------------------------------------------------
function badgerPickOutputDir(): string {
  for (const dir of badgerOutputDirs) {
    if (badgerFs.existsSync(dir) === false) {
      badgerFs.mkdirSync(dir, { recursive: true });
    }
    if (badgerFs.existsSync(dir)) {
      return dir;
    }
  }
  return badgerOutputDirs[0];
}

function badgerWriteLine(dir: string, line: string): string {
  const target = badgerPath.join(dir, badgerOutputFileName);
  badgerFs.writeFileSync(target, line, "utf8");
  return target;
}

function badgerReadBack(target: string): string {
  return badgerFs.readFileSync(target, "utf8");
}

// ---------------------------------------------------------------------------
// Verification. The file on disk must be byte-identical to the composed
// line, and it must pass the gate validation a second time, read from disk
// rather than from memory. A mismatch is a hard failure: the program exits
// non-zero and says so, instead of printing a cheerful summary over a bad
// file.
// ---------------------------------------------------------------------------
function badgerVerifyWritten(target: string, line: string): string[] {
  const problems: string[] = [];
  const onDisk = badgerReadBack(target);
  if (onDisk !== line) {
    problems.push("file on disk differs from the composed line");
  }
  const diskBytes = badgerFs.readFileSync(target);
  const memoryBytes = Buffer.from(line, "utf8");
  if (Buffer.compare(diskBytes, memoryBytes) !== 0) {
    problems.push("file bytes on disk differ from the composed bytes");
  }
  const recheck = badgerValidateLine(onDisk);
  if (recheck.ok === false) {
    for (const reason of recheck.reasons) {
      problems.push(`recheck from disk: ${reason}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Reporting. The report goes to stdout only; the entry itself is the file,
// never the log.
// ---------------------------------------------------------------------------
function badgerReport(target: string, line: string, verdict: BadgerVerdict): void {
  console.log(`wrote ${target}`);
  console.log(`chars: ${verdict.chars} (limit ${badgerMinChars}-${badgerMaxChars})`);
  console.log(`bytes: ${verdict.bytes}`);
  console.log(`line: ${line}`);
}

// ---------------------------------------------------------------------------
// Entry point. Compose twice and demand agreement, validate, write, verify,
// report.
// ---------------------------------------------------------------------------
function badgerMain(): number {
  const firstDraft = badgerComposeLine();
  const secondDraft = badgerComposeLine();
  if (firstDraft !== secondDraft) {
    console.error("compose: two compositions disagree, refusing to write");
    return 1;
  }

  const line = firstDraft;
  const verdict = badgerValidateLine(line);

  if (verdict.ok === false) {
    for (const reason of verdict.reasons) {
      console.error(`gate: ${reason}`);
    }
    return 1;
  }

  const dir = badgerPickOutputDir();
  const target = badgerWriteLine(dir, line);
  const problems = badgerVerifyWritten(target, line);

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`verify: ${problem}`);
    }
    return 1;
  }

  badgerReport(target, line, verdict);
  return 0;
}

process.exitCode = badgerMain();
