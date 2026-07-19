import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("publishes and executes the git_bash_exec MCP tool", async (t) => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["src/server.mjs"],
    cwd: pluginRoot,
    stderr: "pipe",
  });
  const client = new Client({ name: "git-bash-executor-test", version: "0.1.0" });
  t.after(async () => client.close());

  await client.connect(transport);
  const listed = await client.listTools();
  assert.ok(listed.tools.some((tool) => tool.name === "git_bash_exec"));

  const result = await client.callTool({
    name: "git_bash_exec",
    arguments: { command: "printf 'mcp-ok'", cwd: pluginRoot },
  });

  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.exitCode, 0);
  assert.equal(result.structuredContent.stdout, "mcp-ok");
});
