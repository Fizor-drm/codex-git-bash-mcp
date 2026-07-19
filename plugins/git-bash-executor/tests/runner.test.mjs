import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";

async function loadRunner() {
  return import("../src/runner.mjs");
}

test("returns stdout and runs in the requested directory", async () => {
  const { runGitBash } = await loadRunner();
  const cwd = path.join(os.tmpdir(), "git-bash-executor-cwd");
  await fs.mkdir(cwd, { recursive: true });

  const result = await runGitBash({
    command: "printf 'hello'; printf '\\n%s' \"$PWD\"",
    cwd,
    bashPath,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
  assert.match(result.stdout, /^hello\n/);
  assert.match(result.stdout.replaceAll("\\", "/"), /git-bash-executor-cwd$/);
  assert.equal(result.stderr, "");
});

test("returns stderr and a non-zero exit code", async () => {
  const { runGitBash } = await loadRunner();

  const result = await runGitBash({
    command: "printf 'failed' >&2; exit 7",
    bashPath,
  });

  assert.equal(result.exitCode, 7);
  assert.equal(result.stderr, "failed");
  assert.equal(result.timedOut, false);
});

test("terminates commands that exceed the timeout", async () => {
  const { runGitBash } = await loadRunner();
  const startedAt = Date.now();

  const result = await runGitBash({
    command: "sleep 2",
    timeoutMs: 100,
    bashPath,
  });

  assert.equal(result.timedOut, true);
  assert.notEqual(result.exitCode, 0);
  assert.ok(Date.now() - startedAt < 1_000, "the process tree should terminate promptly");
});

test("preserves the beginning and end when output is truncated", async () => {
  const { runGitBash } = await loadRunner();

  const result = await runGitBash({
    command: "printf 'A%.0s' {1..800}; printf 'MIDDLE'; printf 'Z%.0s' {1..800}",
    maxOutputBytes: 1_024,
    bashPath,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdoutTruncated, true);
  assert.equal(result.stderrTruncated, false);
  assert.match(result.stdout, /^A+/);
  assert.match(result.stdout, /\[output truncated\]/);
  assert.match(result.stdout, /Z+$/);
  assert.ok(Buffer.byteLength(result.stdout, "utf8") <= 1_024);
});
