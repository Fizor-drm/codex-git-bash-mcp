#!/usr/bin/env node
import readline from "node:readline";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  runGitBash,
} from "./runner.mjs";

const SERVER_INFO = { name: "git-bash-executor", version: "0.1.0" };
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
    },
  },
  outputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["exitCode", "signal", "stdout", "stderr", "timedOut"],
    properties: {
      exitCode: { type: "integer" },
      signal: { type: ["string", "null"] },
      stdout: { type: "string" },
      stderr: { type: "string" },
      timedOut: { type: "boolean" },
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

  const timeoutMs = args.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = args.max_output_bytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000) {
    throw new TypeError("timeout_ms must be an integer between 100 and 600000");
  }
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1_024 || maxOutputBytes > 10_485_760) {
    throw new TypeError("max_output_bytes must be an integer between 1024 and 10485760");
  }

  return { command: args.command, cwd: args.cwd, timeoutMs, maxOutputBytes };
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
      const result = await runGitBash(validateArguments(params.arguments));
      sendResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
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
