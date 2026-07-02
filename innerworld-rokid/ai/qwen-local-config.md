# Qwen Local Configuration

This file documents local-only configuration names for Qwen/DashScope integration. It must not contain real secrets.

Supported local inputs:

- `QWEN_API_KEY`: preferred Qwen API key environment variable.
- `DASHSCOPE_API_KEY`: DashScope-compatible fallback environment variable.
- `QWEN_MODEL`: optional model name for remote text generation.

Allowed local secret sources:

- Environment variables set in the current shell/session.
- Untracked local files ignored by Git, such as `.env.local` or `local-secrets/qwen.env`.

Behavior without secrets:

- The demo uses the local rule-based generator.
- Missing Qwen/DashScope secrets must not block local development, checks, or demo startup.

Do not add real API keys or real-key-shaped examples to this file.
