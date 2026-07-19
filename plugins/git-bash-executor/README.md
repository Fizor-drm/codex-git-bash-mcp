# Git Bash Executor

A Codex plugin that exposes `git_bash_exec`, an MCP tool for running development commands through Git for Windows Bash.

## Requirements

- Windows
- Git for Windows at `C:\Program Files\Git\bin\bash.exe`
- Codex with local MCP support

Set `GIT_BASH_PATH` before starting Codex to override the Git Bash executable location.

## Tool

`git_bash_exec` accepts a command and an existing absolute Windows working directory. It returns `exitCode`, `signal`, `stdout`, `stderr`, and `timedOut`. Commands default to a 120-second timeout and retain at most 1 MiB each of stdout and stderr.

This tool can execute arbitrary commands with the permissions of the Codex process. Continue to apply Codex approval, sandbox, and destructive-action rules. The runtime server uses only Node.js built-ins and has no runtime npm dependencies.

## Development

```bash
pnpm install
pnpm test
```

After installing or updating the plugin, start a new Codex task so its skill and MCP tool are loaded.
