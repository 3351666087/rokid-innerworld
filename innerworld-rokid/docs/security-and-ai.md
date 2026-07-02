# Security and AI Integration

This demo can connect to Qwen/DashScope for text generation, but API keys must stay local.

## Secret Handling

- Provide `QWEN_API_KEY` or `DASHSCOPE_API_KEY` only through a local machine environment variable or a local untracked secret file.
- Never commit API keys, `.env` files, `*.secret` files, or files under `secrets/` and `local-secrets/`.
- Never paste API keys into docs, sample payloads, screenshots, logs, issue text, release bundles, or generated demo output.
- Keep local secret file names boring and explicit, for example `local-secrets/qwen.env`, and load them only in your own shell/session.

Example local shell setup:

```powershell
$env:QWEN_API_KEY = "<your local key>"
$env:QWEN_MODEL = "qwen-plus"
```

Use placeholder values in documentation and tests. Do not add real keys or real-key-shaped samples.

## Qwen Model Configuration

`QWEN_MODEL` controls the default Qwen text-generation model when a remote provider is enabled. Keep the default conservative and easy to replace.

The user-mentioned model names `qwen-3.7-max` and `qwen3-max` must be verified against the current official Qwen/DashScope documentation before use. If the official model list does not include the exact name, do not ship it as a default.

If no `QWEN_API_KEY` or `DASHSCOPE_API_KEY` is present, the demo must fall back to the local rule-based generator and continue running. Missing AI environment variables should not block localhost demo startup, smoke checks, Unity protocol checks, or field rehearsal.

## Local Security Check

Run this before sharing or packaging:

```powershell
npm run check:security
```

The check scans project text files for obvious leaked-key patterns such as long `sk-` tokens and Qwen/DashScope key assignments. It reports only the file, line, and rule name; it does not print matched secret text.

The scanner skips dependency folders, generated output, binary assets, and local secret locations such as `.env`, `*.secret`, `secrets/`, and `local-secrets/`.
