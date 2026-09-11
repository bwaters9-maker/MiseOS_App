/**
 * scripts/runFirestoreRulesTest.ts
 * Wrapper around `firebase emulators:exec` for scripts/testFirestoreRules.ts.
 * Run via `npm run test:rules`.
 *
 * `firebase emulators:exec` can report exit code 0 even when the emulator
 * never started at all and the wrapped test script never ran — observed
 * directly: a missing JVM prints "Could not spawn `java -version`" and the
 * CLI shuts down "cleanly" without ever invoking testFirestoreRules.ts,
 * yet still exits 0. A rules test that can silently pass without running
 * is worse than no test. This wrapper never trusts that exit code alone:
 * (1) it preflights the JVM directly, so the common case gets a precise,
 * actionable message instead of firebase's swallowed one, and (2) it
 * greps the captured output for testFirestoreRules.ts's own summary line
 * and refuses to pass unless that line is present and reports zero
 * failures — covering any other future silent-failure mode of
 * emulators:exec, not just this one.
 */
import { spawnSync, execSync } from 'node:child_process';

function fail(message: string): never {
  console.error(`\nFAIL  ${message}\n`);
  process.exit(1);
}

const javaCheck = spawnSync('java', ['-version']);
if (javaCheck.error || javaCheck.status !== 0) {
  fail(
    'No JVM found on PATH. The Firestore/Auth emulators require Java.\n' +
    '      Install one, e.g.: winget install EclipseAdoptium.Temurin.21.JDK\n' +
    '      then retry: npm run test:rules'
  );
}

const CMD = 'npx firebase emulators:exec --only firestore,auth "npx tsx scripts/testFirestoreRules.ts" 2>&1';

let output: string;
let exitCode = 0;
try {
  output = execSync(CMD, { encoding: 'utf8' });
} catch (err: unknown) {
  const e = err as { stdout?: string; status?: number; message?: string };
  output = e.stdout || e.message || String(err);
  exitCode = typeof e.status === 'number' ? e.status : 1;
}

process.stdout.write(output);

const summary = output.match(/(\d+) passed, (\d+) failed\.\s*$/m);
if (!summary) {
  fail(
    'testFirestoreRules.ts never reported a result -- the emulator run did ' +
    'not actually complete (spawn failure, crash, or emulators:exec exited ' +
    'before invoking it). Do not treat this as a pass.'
  );
}

const [, passedStr, failedStr] = summary;
if (exitCode !== 0 || parseInt(failedStr, 10) > 0) {
  fail(`Firestore rules suite failed: ${passedStr} passed, ${failedStr} failed.`);
}

console.log(`\nPASS  Firestore rules suite: ${passedStr} passed, 0 failed.\n`);
process.exit(0);
