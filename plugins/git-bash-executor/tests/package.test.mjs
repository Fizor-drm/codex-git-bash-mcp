import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the MCP server has no runtime package dependencies", () => {
  const serverPath = path.join(pluginRoot, "src", "server.mjs");
  const source = fs.readFileSync(serverPath, "utf8");

  assert.doesNotMatch(
    source,
    /from ["'](?:@modelcontextprotocol\/sdk|zod)/,
    "the runtime server must use only Node.js and local modules",
  );
});
