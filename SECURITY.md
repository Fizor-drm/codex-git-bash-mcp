# Security Policy

## Security model

Git Bash Executor intentionally executes arbitrary Git Bash commands with the permissions granted to the Codex process. Installing the plugin does not bypass Codex sandbox, approval, or destructive-action policies, but every command should still be reviewed according to those policies.

The MCP tool requires an explicit absolute working directory, limits retained output, and applies a bounded timeout. It does not transmit commands or output to an external service.

## Reporting a vulnerability

Please report vulnerabilities privately through the repository host's security-advisory feature. Include reproduction steps, affected versions, and the expected impact. Do not include API keys, passwords, or other secrets in reports.
