import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_MAX_OUTPUT_BYTES = 32_768;
export const FULL_MAX_OUTPUT_BYTES = 1_048_576;

function collectBounded(stream, maxBytes) {
  const marker = Buffer.from("\n[output truncated]\n");
  const tailLimit = Math.floor((maxBytes - marker.length) / 2);
  const headLimit = maxBytes - marker.length - tailLimit;
  const initialChunks = [];
  let initialSize = 0;
  let tail = Buffer.alloc(0);
  let totalSize = 0;

  stream.on("data", (chunk) => {
    totalSize += chunk.length;
    if (initialSize < maxBytes) {
      const accepted = chunk.subarray(0, maxBytes - initialSize);
      initialChunks.push(accepted);
      initialSize += accepted.length;
    }
    tail = Buffer.concat([tail, chunk]).subarray(-tailLimit);
  });

  return () => {
    const initial = Buffer.concat(initialChunks);
    if (totalSize <= maxBytes) {
      return { text: initial.toString("utf8"), truncated: false };
    }
    const bounded = Buffer.concat([initial.subarray(0, headLimit), marker, tail]);
    return { text: bounded.toString("utf8"), truncated: true };
  };
}

export async function runGitBash({
  command,
  cwd = process.cwd(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  bashPath = process.env.GIT_BASH_PATH || DEFAULT_BASH_PATH,
}) {
  if (typeof command !== "string" || command.trim() === "") {
    throw new TypeError("command must be a non-empty string");
  }
  if (!path.isAbsolute(cwd) || !fs.statSync(cwd).isDirectory()) {
    throw new TypeError("cwd must be an existing absolute directory");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000) {
    throw new TypeError("timeoutMs must be an integer between 100 and 600000");
  }
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1024 || maxOutputBytes > 10_485_760) {
    throw new TypeError("maxOutputBytes must be an integer between 1024 and 10485760");
  }
  if (!fs.existsSync(bashPath)) {
    throw new Error(`Git Bash was not found at: ${bashPath}`);
  }

  return new Promise((resolve, reject) => {
    const timeoutSeconds = `${timeoutMs / 1000}s`;
    const child = spawn(
      bashPath,
      [
        "-lc",
        'exec timeout --kill-after=1s "$1" bash -lc "$2"',
        "git-bash-executor",
        timeoutSeconds,
        command,
      ],
      {
      cwd,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const readStdout = collectBounded(child.stdout, maxOutputBytes);
    const readStderr = collectBounded(child.stderr, maxOutputBytes);
    const fallbackTimer = setTimeout(() => child.kill("SIGKILL"), timeoutMs + 5_000);

    child.once("error", (error) => {
      clearTimeout(fallbackTimer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(fallbackTimer);
      const stdout = readStdout();
      const stderr = readStderr();
      resolve({
        exitCode: code ?? -1,
        signal,
        stdout: stdout.text,
        stderr: stderr.text,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
        timedOut: code === 124,
      });
    });
  });
}
