import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;

function collectBounded(stream, maxBytes) {
  const chunks = [];
  let size = 0;
  let truncated = false;

  stream.on("data", (chunk) => {
    if (size >= maxBytes) {
      truncated = true;
      return;
    }
    const remaining = maxBytes - size;
    const accepted = chunk.subarray(0, remaining);
    chunks.push(accepted);
    size += accepted.length;
    if (accepted.length < chunk.length) truncated = true;
  });

  return () => {
    const text = Buffer.concat(chunks).toString("utf8");
    return truncated ? `${text}\n[output truncated]` : text;
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
      resolve({
        exitCode: code ?? -1,
        signal,
        stdout: readStdout(),
        stderr: readStderr(),
        timedOut: code === 124,
      });
    });
  });
}
