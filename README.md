<p align="center">
  <h1 align="center">🤝 collab-dev</h1>
  <p align="center">
    Multi-agent collaborative development skill for <a href="https://github.com/openclaw/openclaw">OpenClaw</a><br/>
    <em>七轮 A/B 双盲测试验证 · 9 个版本迭代 · 每条规则都来自真实 bug</em>
  </p>
</p>

> [!IMPORTANT]
> **使用前请确保已安装并登录以下 CLI 工具：**
> 
> | 工具 | 安装 |
> |------|------|
> | [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm i -g @google/gemini-cli` |
> | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `npm i -g @anthropic-ai/claude-code` |
> | [Codex CLI](https://github.com/openai/codex) | `npm i -g @openai/codex` |
> 
> 安装遇到问题？→ 查看 [troubleshooting.md](references/troubleshooting.md)

---

## 为什么不让一个 Agent 全做？

单 Agent 开发就像一个人同时当设计师、架构师、程序员和 QA——什么都能做，但每个维度都达不到专家水平。

collab-dev 让 **4 个 Agent 各司其职**：

```
🎨 Gemini ── 设计规范 + UI 代码（配色、动效、响应式）
     ↓
🏗️ OpenClaw ── 架构 + 安全模板 + 逻辑骨架
     ↓
⚡ Claude Code ── 填充业务逻辑（只改 TODO 函数体）
     ↓
🔍 Codex ── 代码审查（找 bug，不改代码）
```

## 七轮双盲测试

每轮生成「协作版」和「Solo 版」，**随机分配端口，用户不知道哪个是哪个**。

| # | 项目 | 类型 | 用户选 | Codex 评分 | Claude Code 评分 |
|:-:|------|:----:|:------:|:---------:|:---------------:|
| 1 | TaskFlow 任务看板 | 标准 | — | 39 vs 40 | — |
| 2 | PollBox 在线投票 | 🎨视觉 | ✅ 协作 | 6.0 vs 7.3 | — |
| 3 | ChatRoom 聊天室 | 标准 | Solo | 36 vs 44 | — |
| 4 | ChatRoom v2 | 标准 | ✅ 协作 | **42** vs 38 | — |
| 5 | NoteBoard 便签板 | 标准 | ✅ 协作 | **36** vs 33 | — |
| 6 | LinkBox 书签收藏 | 标准 | ✅ 协作 | 37 vs 39 | 26 vs 26 |
| 7 | Pomodoro 番茄钟 | 🎨视觉 | ✅ 协作 | **42** vs 31 | **49** vs 35 |

**用户选协作版 5/6 次。** 第 7 轮（视觉型）三方一致选协作版。

### 核心发现

| 发现 | 数据支撑 |
|------|---------|
| 视觉密集型项目协作版完胜 | Pomodoro 轮：Codex 42 vs 31，Claude Code 49 vs 35 |
| 设计一致性是关键指标 | 从 v1 的 4/10 提升到 v9 的 9/10 |
| Phase 1 拆两步是最大突破 | 先写 design.md 再写 HTML，设计一致性翻倍 |
| Codex Review 最稳定 | 每轮都发现真实 bug |
| 标准 CRUD 项目差距不大 | 协作版小幅领先，但不值得额外复杂度 |

## 工作流（10-17 分钟）

```
Phase 0   OpenClaw 写 spec.md
            ├── 数据模型 · 功能优先级 · API 设计 · 验收标准
            └── ⚠️ 不写 UI 风格提示（留给 Gemini）
              ↓
Phase 1a  Gemini 写 design.md
            └── CSS 变量 · class 命名 · 动效规范 · 响应式
Phase 1b  Gemini 写 index.html
            └── 纯表现层代码，不含 JS 逻辑
              ↓
Phase 2   OpenClaw 写 server.js + 注入 JS 骨架
            ├── 安全模板（JWT · bcrypt · 白名单 · 参数化查询）
            ├── SSE 模板（uuid key · 排除当前连接 · 心跳）
            └── // TODO 标记（含步骤说明）
              ↓
Phase 3   Claude Code 填 TODO ←同时→ Codex 预审骨架
              ↓
Phase 4   OpenClaw 自动化验证
            ├── 语法 · TODO=0 · 设计命名一致
            ├── CSS/JS class 交叉检查
            ├── 安全 · DOM 结构 · Spec 覆盖率
              ↓
Phase 5   OpenClaw diff 自审 + 修复
Phase 6   Codex 终审 → review.md
Phase 7   修 Critical/High
Phase 8   验收交付
```

## 从踩坑中学到的规则

每条规则都来自真实的双盲测试 bug，不是理论推导。

<details>
<summary><b>Phase 0: Spec 怎么写</b></summary>

| 规则 | 踩过的坑 |
|------|---------|
| 不写 UI 风格提示 | 第 6 轮：写了"类似 Raindrop"导致两版 UI 趋同，Gemini 无法差异化 |
| 明确数据模型 | 第 5 轮：没写共享/私有，导致协作语义混乱 |
| 功能标 P0/P1/P2 | 第 5 轮：spec 写了拖拽排序但两版都没实现 |
| 字段命名统一 | 第 6 轮：API 用 `desc`，DB 用 `description`，前后端对不上 |
| 搜索策略二选一 | 第 6 轮：server + client 双重搜索，逻辑冲突 |

</details>

<details>
<summary><b>Phase 1: Gemini 设计</b></summary>

| 规则 | 踩过的坑 |
|------|---------|
| 拆两步（先规范再代码）| v1-v4 设计一致性只有 4 分，拆两步后飙到 9 分 |
| 统一 `.hidden` 显隐 | 第 5 轮：Gemini CSS 用 `display:none`，JS 用 `.hidden`，弹窗打不开 |
| 移动端保留 P0 功能 | 第 6 轮：侧边栏被 `display:none` 直接隐藏，标签筛选手机上不能用 |

</details>

<details>
<summary><b>Phase 2: OpenClaw 骨架</b></summary>

| 规则 | 踩过的坑 |
|------|---------|
| bcrypt 必须异步 | 第 6 轮：`hashSync` 阻塞事件循环 |
| JWT 密钥支持 env var | 第 5、6 轮：Solo 版硬编码密钥，致命漏洞 |
| SSE 排除当前连接 | 第 6 轮：当前页收到自己的事件，双重刷新 |
| 空状态放 grid 外 | 第 6 轮：`innerHTML` 覆盖 grid 时把空状态也删了 |
| 事件委托替代 onclick | 第 6 轮：内联 onclick 拼接有 XSS 风险 |
| DB 用 `path.join(__dirname)` | 第 6 轮：相对路径导致不同目录启动数据库位置不同 |
| 枚举字段白名单 | 第 5 轮：color 无校验直接拼入 HTML class → XSS |

</details>

## 版本演进

```
v1 ❌ Gemini ACP 从未成功
v2 ⚠️ 设计参数在传递中丢失
v3 ⚠️ Claude 不遵守设计规范
v4 🚀 Gemini 直接写 UI 代码 → 用户首次选协作版
v7 ✅ Phase 1 拆两步 → 设计一致性 4→9 分
v8 ✅ 安全模板 + CSS/JS 集成检查
v9 ✅ 双 Review 驱动 → 异步安全 + 移动端铁律
```

## 适用场景

| 场景 | 推荐 | 说明 |
|------|:----:|------|
| Dashboard / 数据可视化 | ⭐⭐⭐ | Gemini 设计系统价值最大 |
| 动画交互型应用 | ⭐⭐⭐ | 渐变、SVG 动画、主题切换 |
| 需要设计系统的中大型项目 | ⭐⭐⭐ | design.md 确保全局一致性 |
| 标准 CRUD 工具 | ⭐⭐ | 可用但 Solo 差距不大 |
| 简单单页应用 | ⭐ | 协作开销不值得，直接 Solo |

## 安装

```bash
# OpenClaw CLI
openclaw skills install laolin5564/collab-dev

# 手动
mkdir -p ~/.openclaw/skills/collab-dev
curl -o ~/.openclaw/skills/collab-dev/SKILL.md \
  https://raw.githubusercontent.com/laolin5564/collab-dev/master/SKILL.md
```

## 使用

对 OpenClaw 说：

```
协作开发一个番茄钟应用
collab dev a dashboard
multi-agent build 一个投票系统
```

OpenClaw 自动执行 Phase 0→8 完整流程。

## 相关

- [OpenClaw](https://github.com/openclaw/openclaw) — AI Agent 运行时
- [ClawHub](https://clawhub.com) — Skill 市场

## License

MIT
