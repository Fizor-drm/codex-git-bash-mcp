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
  const tool = listed.tools.find((candidate) => candidate.name === "git_bash_exec");
  assert.ok(tool);
  assert.deepEqual(tool.inputSchema.properties.output_mode.enum, ["compact", "full"]);
  assert.equal(tool.inputSchema.properties.output_mode.default, "compact");
  assert.equal(tool.inputSchema.properties.max_output_bytes.default, 32_768);

  const result = await client.callTool({
    name: "git_bash_exec",
    arguments: { command: "printf 'mcp-ok'", cwd: pluginRoot },
  });

  assert.equal(result.isError, false);
  assert.equal(result.content[0].text, "mcp-ok");
  assert.equal(result.structuredContent.exitCode, 0);
  assert.equal(result.structuredContent.outputMode, "compact");
  assert.equal(result.structuredContent.stdoutTruncated, false);
  assert.equal("stdout" in result.structuredContent, false);
  assert.equal("stderr" in result.structuredContent, false);

  const failed = await client.callTool({
    name: "git_bash_exec",
    arguments: { command: "printf 'diagnostic' >&2; exit 7", cwd: pluginRoot },
  });

  assert.equal(failed.isError, true);
  assert.match(failed.content[0].text, /exitCode: 7/);
  assert.match(failed.content[0].text, /stderr:\ndiagnostic/);
  assert.equal(failed.structuredContent.exitCode, 7);
  assert.equal("stderr" in failed.structuredContent, false);
});
