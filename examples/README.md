# Examples — 第 7 轮双盲测试（Pomodoro 番茄钟）

## 实际产出

### 协作版（Gemini + Claude Code + Codex）

```
examples/pomodoro-collab/
├── spec.md         ← Phase 0: OpenClaw 写的需求规格
├── design.md       ← Phase 1a: Gemini 写的设计规范
├── index.html      ← Phase 1b: Gemini 写的 UI + Phase 3: Claude 填的逻辑
├── server.js       ← Phase 2: OpenClaw 写的骨架 + Phase 3: Claude 填的逻辑
└── package.json
```

### Solo 版（Claude Code 独立完成）

```
examples/pomodoro-solo/
├── index.html      ← Claude Code 独立完成
├── server.js       ← Claude Code 独立完成
└── package.json
```

## 运行方式

```bash
# 协作版
cd examples/pomodoro-collab && npm install && PORT=3001 node server.js

# Solo 版
cd examples/pomodoro-solo && npm install && PORT=3002 node server.js
```

浏览器打开 `http://localhost:3001` 和 `http://localhost:3002` 自行对比。

## Review 报告

- [pomodoro-codex-review.md](pomodoro-codex-review.md) — Codex 评分：协作版 42 vs Solo 版 31
- [pomodoro-claude-review.md](pomodoro-claude-review.md) — Claude Code 评分：协作版 49 vs Solo 版 35

## 评分明细

### Codex Review

| 维度 | 协作版 | Solo 版 |
|------|:------:|:------:|
| 功能完整性 | 7 | 6 |
| 设计一致性 | 8 | 5 |
| 安全性 | 6 | 5 |
| 代码质量 | 7 | 5 |
| 性能 | 8 | 5 |
| Bug 风险 | 6 | 5 |
| **总分** | **42** | **31** |

### Claude Code Review

| 维度 | 协作版 | Solo 版 |
|------|:------:|:------:|
| 功能完整性 | 8 | 7 |
| 设计一致性 | 9 | 6 |
| 安全性 | 8 | 6 |
| 代码质量 | 8 | 6 |
| 性能 | 9 | 5 |
| Bug 风险 | 7 | 5 |
| **总分** | **49** | **35** |
