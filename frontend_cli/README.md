# Tangent CLI

A terminal-based AI coding assistant. Runs inside your project directory and gives an AI agent real access to your files — reading, writing, searching, and running commands — while keeping you in control with confirmation prompts and full transparency into what the agent is doing.

## Features

- **Multi-provider** — Anthropic (Claude) and OpenAI (GPT-4o) out of the box
- **Agentic loop** — the AI chains tool calls until a task is complete, showing each step live
- **Token transparency** — input/output token counts shown after every LLM round-trip
- **Vim-style modal input** — NORMAL / INSERT / SELECT modes so the keyboard is always predictable
- **Branch conversations** — open a parallel thread from any message without losing your main thread
- **Context quoting** — select lines from any message to seed a branch with specific context
- **Syntax-highlighted code and diffs** — code blocks and file diffs render with full color
- **Confirmation before writes** — file writes and shell commands show a diff and wait for `y`/`n`

## Quick Start

```sh
cd frontend_cli
go build -o tangent-cli .
./tangent-cli
```

On first run, Tangent asks you to choose a provider and enter your API key. The key is saved to `~/.tangent/config.json` and reused on future runs.

## Docs

| Document | Description |
|---|---|
| [Usage Guide](docs/USAGE.md) | Modes, keybindings, branching, and all interactions |
| [TUI Architecture](docs/design/TUI_ARCHITECTURE.md) | How the terminal UI is built with Bubbletea |
| [Modal Input](docs/design/MODAL_INPUT.md) | Vim-style modes and key routing |
| [Agent Loop](docs/design/AGENT_LOOP.md) | Provider interface, tool system, confirmation flow |
| [Branch System](docs/design/BRANCHING.md) | Parallel conversations and context quoting |
| [Syntax Highlighting](docs/design/SYNTAX_HIGHLIGHTING.md) | Chroma integration and ANSI color fixes |
