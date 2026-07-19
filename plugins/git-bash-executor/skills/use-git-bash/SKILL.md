---
name: use-git-bash
description: Use for development commands on Windows when Git Bash Executor is installed, including Git, search, build, test, package-manager, and POSIX shell operations.
---

# Use Git Bash

Run Windows development shell commands with the `git_bash_exec` MCP tool.

## Required behavior

- Use it for Git, `rg`, builds, tests, package managers, scripts, and POSIX commands.
- Pass the active workspace as an absolute Windows `cwd`.
- Keep commands scoped and follow existing approval and destructive-action rules.
- Continue using native editing tools such as `apply_patch` for manual edits.
- Use the default `compact` output mode. Retry with `output_mode: full` only when truncated or missing output prevents diagnosis.
- Use PowerShell only for Windows administration Git Bash cannot perform, or when the tool is unavailable.
- Report MCP failure before using another shell for a materially different or privileged operation.

## Tool arguments

- `command`: the Git Bash command.
- `cwd`: an existing absolute Windows directory.
- `timeout_ms`: optional, 100 to 600000; default 120000.
- `output_mode`: optional, `compact` (default, 32 KiB) or `full` (1 MiB).
- `max_output_bytes`: optional explicit limit, 1024 to 10485760.

Treat a non-zero `exitCode` or `timedOut: true` as a failed command. Failure responses include exit details, stderr, and stdout; successful responses stay concise.
