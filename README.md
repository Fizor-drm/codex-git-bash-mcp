# Codex Git Bash MCP

A Codex plugin that runs Windows development commands through Git for Windows Bash.

## What it provides

- `git_bash_exec` MCP tool with an explicit working directory
- Structured stdout, stderr, exit code, signal, and timeout results
- Bounded execution time and retained output
- A Codex skill that directs Git, search, build, test, package-manager, and POSIX commands through Git Bash
- No runtime npm dependencies or external services

## Requirements

- Windows
- Git for Windows installed at `C:\Program Files\Git\bin\bash.exe`
- Codex with local plugin and MCP support

Set `GIT_BASH_PATH` before starting Codex to use a different Git Bash executable.

## Install from a local checkout

From the repository root:

```powershell
codex plugin marketplace add .
codex plugin add git-bash-executor@codex-git-bash-mcp
```

Restart Codex or start a new task after installation so the skill and MCP tool are loaded.

## Security

This plugin intentionally exposes arbitrary command execution through Git Bash. Codex sandbox, approval, and destructive-action rules still apply. Review [SECURITY.md](SECURITY.md) before installation.

## Development

```bash
cd plugins/git-bash-executor
pnpm install
pnpm test
```

## License

MIT
