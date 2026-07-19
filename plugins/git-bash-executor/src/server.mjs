#!/usr/bin/env node
import readline from "node:readline";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  FULL_MAX_OUTPUT_BYTES,
  runGitBash,
} from "./runner.mjs";

const SERVER_INFO = { name: "git-bash-executor", version: "0.2.0" };
const PROTOCOL_VERSION = "2025-06-18";

const tool = {
  name: "git_bash_exec",
  title: "Execute with Git Bash",
  description:
    "Execute a command with Git for Windows Bash. Always pass the active workspace as an absolute Windows cwd path.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["command", "cwd"],
    properties: {
      command: { type: "string", minLength: 1, description: "Git Bash command to execute" },
      cwd: {
        type: "string",
        minLength: 3,
        description: "Existing absolute Windows working directory, such as C:\\work\\project",
      },
      timeout_ms: {
        type: "integer",
        minimum: 100,
        maximum: 600_000,
        default: DEFAULT_TIMEOUT_MS,
        description: "Timeout in milliseconds",
      },
      max_output_bytes: {
        type: "integer",
        minimum: 1_024,
        maximum: 10_485_760,
        default: DEFAULT_MAX_OUTPUT_BYTES,
        description: "Maximum bytes retained separately for stdout and stderr",
      },
      output_mode: {
        type: "string",
        enum: ["compact", "full"],
        default: "compact",
        description: "Compact uses a 32 KiB default limit; full uses a 1 MiB default limit",
      },
    },
  },
  outputSchema: {
    type: "object",
    additionalProperties: false,
    required: [
      "exitCode",
      "signal",
      "timedOut",
      "stdoutTruncated",
      "stderrTruncated",
      "outputMode",
    ],
    properties: {
      exitCode: { type: "integer" },
      signal: { type: ["string", "null"] },
      timedOut: { type: "boolean" },
      stdoutTruncated: { type: "boolean" },
      stderrTruncated: { type: "boolean" },
      outputMode: { type: "string", enum: ["compact", "full"] },
    },
  },
};

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function validateArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new TypeError("arguments must be an object");
  }
  if (typeof args.command !== "string" || args.command.trim() === "") {
    throw new TypeError("command must be a non-empty string");
  }
  if (typeof args.cwd !== "string" || args.cwd.trim() === "") {
    throw new TypeError("cwd must be an existing absolute Windows directory");
  }

  const outputMode = args.output_mode ?? "compact";
  if (outputMode !== "compact" && outputMode !== "full") {
    throw new TypeError("output_mode must be compact or full");
  }
  const timeoutMs = args.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes =
    args.max_output_bytes ??
    (outputMode === "full" ? FULL_MAX_OUTPUT_BYTES : DEFAULT_MAX_OUTPUT_BYTES);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000) {
    throw new TypeError("timeout_ms must be an integer between 100 and 600000");
  }
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1_024 || maxOutputBytes > 10_485_760) {
    throw new TypeError("max_output_bytes must be an integer between 1024 and 10485760");
  }

  return { command: args.command, cwd: args.cwd, timeoutMs, maxOutputBytes, outputMode };
}

function metadata(result, outputMode) {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    stdoutTruncated: result.stdoutTruncated,
    stderrTruncated: result.stderrTruncated,
    outputMode,
  };
}

function formatResult(result) {
  if (result.exitCode === 0 && !result.timedOut) {
    const parts = [];
    if (result.stdout) parts.push(result.stdout);
    if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
    return parts.join("\n") || "Command completed successfully.";
  }

  const parts = [`exitCode: ${result.exitCode}`, `timedOut: ${result.timedOut}`];
  if (result.signal) parts.push(`signal: ${result.signal}`);
  if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
  if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
  return parts.join("\n");
}

async function handleRequest(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    sendResult(id, {
      protocolVersion: params?.protocolVersion ?? PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
    });
    return;
  }
  if (method === "ping") {
    sendResult(id, {});
    return;
  }
  if (method === "tools/list") {
    sendResult(id, { tools: [tool] });
    return;
  }
  if (method === "tools/call") {
    if (params?.name !== tool.name) {
      sendError(id, -32602, `Unknown tool: ${params?.name ?? ""}`);
      return;
    }
    try {
      const validated = validateArguments(params.arguments);
      const result = await runGitBash(validated);
      sendResult(id, {
        content: [{ type: "text", text: formatResult(result) }],
        structuredContent: metadata(result, validated.outputMode),
        isError: result.exitCode !== 0,
      });
    } catch (error) {
      sendResult(id, {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      });
    }
    return;
  }

  if (id !== undefined) sendError(id, -32601, `Method not found: ${method}`);
}

const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", (line) => {
  if (line.trim() === "") return;
  try {
    const message = JSON.parse(line);
    void handleRequest(message).catch((error) => {
      if (message.id !== undefined) {
        sendError(message.id, -32603, error instanceof Error ? error.message : String(error));
      }
    });
  } catch (error) {
    sendError(null, -32700, error instanceof Error ? error.message : "Parse error");
  }
});
