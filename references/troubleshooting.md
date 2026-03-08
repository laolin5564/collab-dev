# Troubleshooting Guide

## Prerequisites Installation

### Gemini CLI
```bash
npm i -g @google/gemini-cli
gemini   # 首次运行自动引导 Google 账号登录
```

### Claude Code
```bash
npm i -g @anthropic-ai/claude-code
claude   # 首次运行自动引导浏览器 OAuth
```
⚠️ **macOS 注意**：SSH session 无法写入 Keychain，必须在本机终端运行 `claude` 完成 OAuth，不能通过 SSH。

### Codex CLI
```bash
npm i -g @openai/codex
codex   # 首次运行自动引导 OpenAI 登录
```

## Common Pitfalls

### Claude Code ACP exits with code 5

**症状**：ACP session 报 `ACP_TURN_FAILED: exited with code 5`，文件写入和命令执行被拒
**原因**：OpenClaw acpx 默认 `permissionMode: "approve-reads"`，只批准读操作
**修复**：openclaw.json 中设置 `plugins.acpx.config.permissionMode` 为 `"approve-all"`

### Gemini ACP prompt 丢失

**症状**：ACP session 启动成功但 Gemini 只回 "How can I help you today?"，没收到任务描述
**原因**：acpx 内置 gemini 命令是裸 `gemini`，缺少 `--experimental-acp` 参数
**修复**：`~/.acpx/config.json` 写入：
```json
{"agents":{"gemini":{"command":"gemini --experimental-acp"}}}
```
**额外**：gemini 还需加入 openclaw.json 的 `acp.allowedAgents` 列表

### Gemini ACP 始终不可靠

**症状**：Gemini ACP 反复失败，prompt 丢失或 session 无响应
**原因**：Gemini 的 ACP 实现与 exec 模式不兼容，session/load 失败后重建 session 会丢失原始 prompt
**结论**：放弃 Gemini ACP，一律用 `gemini -p` CLI 模式（本 skill 默认使用此模式）

### Codex 能用但 OpenClaw 报 token 过期

**症状**：Codex CLI 正常工作，但 OpenClaw ACP 调 Codex 报认证失败
**原因**：两套独立的 auth 文件：
- Codex CLI：`~/.codex/auth.json`
- OpenClaw：`~/.openclaw/agents/main/agent/auth-profiles.json`
**修复**：手动把 Codex CLI 的 token 同步到 OpenClaw auth-profiles

### ACP spawn 失败 "max sessions"

**症状**：`sessions_spawn` 报错达到最大并发数
**原因**：ACP 默认最多 3 个并发 session，旧 session 不会自动清理
**修复**：
```bash
# 查看堆积的 session
ls ~/.acpx/sessions/ | wc -l
# 清理
rm ~/.acpx/sessions/*.json
```
**预防**：openclaw.json 中 `maxConcurrentSessions` 建议设为 10

### Claude Code 首次启动卡在主题选择

**症状**：SSH 运行 `claude` 出现主题选择交互界面
**说明**：正常行为，选完后进入登录流程。但 OAuth 仍需本机浏览器完成（见上方 macOS 注意事项）
