---
name: use-git-bash
description: Use for development commands on Windows when Git Bash Executor is installed, including Git, search, build, test, package-manager, and POSIX shell operations.
---

# Use Git Bash

Use the `git_bash_exec` MCP tool for development shell commands on Windows.

## Required behavior

- Use `git_bash_exec` for Git, `rg`, builds, tests, package managers, scripts, and POSIX shell operations.
- Always pass the active workspace as an absolute Windows path in `cwd`.
- Keep each command scoped to the user's task and follow all existing approval and destructive-action rules.
- Use native file-editing tools such as `apply_patch` for manual edits; this skill changes command execution, not editing policy.
- Use PowerShell only for Windows-specific administration that Git Bash cannot perform, or when the MCP tool is unavailable.
- If the MCP tool fails, report the failure before falling back to another shell for a materially different or privileged operation.

## Tool arguments

- `command`: the Git Bash command.
- `cwd`: an existing absolute Windows directory.
- `timeout_ms`: optional, from 100 to 600000; default 120000.
- `max_output_bytes`: optional, from 1024 to 10485760; default 1048576.

Treat a non-zero `exitCode` or `timedOut: true` as a failed command and inspect both `stdout` and `stderr`.
