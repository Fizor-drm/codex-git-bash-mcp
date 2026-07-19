# Codex Git Bash MCP

[English](README.md) | 日本語

Windows上の開発コマンドをGit for Windows Bash経由で実行するCodexプラグインです。

## 主な機能

- 作業ディレクトリを明示して実行する `git_bash_exec` MCPツール
- 成功時は簡潔、失敗時は詳細な診断情報を返し、ログの重複を排除
- 通常は32 KiB、`output_mode: full` では1 MiBまで保持する適応的な出力上限
- 実行時間に上限を設け、出力を省略する場合も先頭と末尾を保持
- Git、検索、ビルド、テスト、パッケージマネージャー、POSIXコマンドをGit Bash経由で実行するCodexスキル
- 実行時のnpm依存関係および外部サービスなし

## 動作要件

- Windows
- Git for Windowsが `C:\Program Files\Git\bin\bash.exe` にインストールされていること
- ローカルプラグインおよびMCPを利用できるCodex

別の場所にあるGit Bashを使用する場合は、Codexを起動する前に環境変数 `GIT_BASH_PATH` を設定してください。

## ローカルチェックアウトからインストール

リポジトリのルートで次を実行します。

```powershell
codex plugin marketplace add .
codex plugin add git-bash-executor@codex-git-bash-mcp
```

インストール後、Codexを再起動するか新しいタスクを開始して、スキルとMCPツールを読み込んでください。

通常はトークン消費を抑えるcompactモードを使用します。出力の省略や情報不足で診断できない場合だけ、同梱スキルがfullモードを指定します。

## セキュリティ

このプラグインは、Git Bashを通じて任意のコマンドを実行する機能を提供します。Codexのサンドボックス、承認、破壊的操作に関するルールは引き続き適用されます。インストール前に [SECURITY.md](SECURITY.md) を確認してください。

## 開発

```bash
cd plugins/git-bash-executor
pnpm install
pnpm test
```

## ライセンス

MIT
