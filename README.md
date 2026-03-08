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
> | 工具 | 安装 | 登录 |
> |------|------|------|
> | [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm i -g @google/gemini-cli` | 运行 `gemini`，按提示登录 Google 账号 |
> | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `npm i -g @anthropic-ai/claude-code` | 运行 `claude`，按提示完成浏览器 OAuth |
> | [Codex CLI](https://github.com/openai/codex) | `npm i -g @openai/codex` | 运行 `codex`，按提示登录 OpenAI 账号 |
> 
> 安装遇到问题？→ 查看 [troubleshooting.md](references/troubleshooting.md)

---

## 为什么不让一个 Agent 全做？

单 Agent 开发就像一个人同时当设计师、架构师、程序员和 QA——什么都能做，但每个维度都达不到专家水平。

collab-dev 让 **4 个 Agent 各司其职**：

### Solo（左）vs 协作（右）实际对比

**桌面端**：协作版双栏布局 + 渐变色系统，Solo 版单栏朴素布局
![桌面端对比](assets/comparison-desktop.jpg)

**移动端**：协作版保持双栏自适应，Solo 版线性堆叠
![移动端对比](assets/comparison-mobile.jpg)

**登录页**：Solo 版全屏沉浸式，协作版模态弹窗 + 背景可见
![登录页对比](assets/comparison-login.jpg)

> 以上截图来自第 7 轮双盲测试（Pomodoro 番茄钟），左侧 Solo 版由 Claude Code 独立完成，右侧协作版由 Gemini + Claude Code + Codex 协作完成。

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
Phase -1  OpenClaw 根据描述生成 PRD（用户故事 + 功能清单 + 验收标准）
            └── 用户确认后继续
              ↓
Phase 0   OpenClaw 从 PRD 提取 spec.md
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

## 💡 想先看实际效果？

[examples/](examples/) 里有第 7 轮双盲测试的**完整源码**，可以直接运行对比：

```bash
git clone https://github.com/laolin5564/collab-dev.git
cd collab-dev/examples/pomodoro-collab && npm install && PORT=3001 node server.js
# 另一个终端
cd collab-dev/examples/pomodoro-solo && npm install && PORT=3002 node server.js
```

打开 `localhost:3001`（协作版）和 `localhost:3002`（Solo 版），自己看、自己判断。

详细评分 → [examples/README.md](examples/README.md)

## 使用指南

### 前提条件

确保你已经：
1. 安装了 [OpenClaw](https://github.com/openclaw/openclaw) 并正常运行
2. 安装并登录了 Gemini CLI、Claude Code、Codex CLI（见顶部表格）
3. OpenClaw 的 ACP 配置已就绪（首次触发 skill 时会自动检查）

### 触发方式

对 OpenClaw 说以下任意一句即可触发协作开发流程：

```
协作开发一个番茄钟应用
collab dev a dashboard
multi-agent build 一个投票系统
```

### 完整使用流程

```
1. 你告诉 OpenClaw 要做什么项目
   └── "协作开发一个在线投票系统"

2. OpenClaw 自动写 spec.md（需求规格）
   └── 你可以检查并修改，满意后继续

3. Gemini 自动生成设计规范 + UI 代码（约 2-3 分钟）
   ├── design.md — CSS 变量、配色、命名规范
   └── index.html — 纯 UI 代码，不含逻辑

4. OpenClaw 自动写后端骨架 + 注入 JS 框架
   ├── server.js — 认证、数据库、API、SSE
   └── index.html — 补充 JS 骨架，标记 // TODO

5. Claude Code 自动填充业务逻辑（约 3-5 分钟）
   └── 只改 // TODO 标记的函数体，不动 UI

6. OpenClaw 自动验证
   ├── 语法检查 + TODO 残留 = 0
   ├── 设计一致性 + CSS/JS 交叉检查
   ├── 安全审查 + DOM 结构检查
   └── Spec 覆盖率（P0 全绿）

7. Codex 自动做代码审查 → 生成 review.md

8. OpenClaw 根据 review 修复问题 → 交付
```

**全程自动，预计 10-17 分钟。** 你只需要描述需求（一句话就行），OpenClaw 会先生成 PRD 确认，再自动走完全流程。

### 输出文件

完成后项目目录结构：

```
your-project/
├── spec.md              ← 需求规格
├── design.md            ← Gemini 设计规范
├── server.js            ← 后端（Express + SQLite + JWT + SSE）
├── public/index.html    ← 前端（Gemini UI + Claude 逻辑）
├── package.json
└── review.md            ← Codex 代码审查报告
```

### 配置要求（OpenClaw）

如果 Claude Code / Codex 通过 ACP 调用失败，检查 `openclaw.json`：

```json
{
  "plugins": {
    "acpx": {
      "config": {
        "permissionMode": "approve-all"
      }
    }
  }
}
```

更多排查 → [references/troubleshooting.md](references/troubleshooting.md)

## 相关

- [OpenClaw](https://github.com/openclaw/openclaw) — AI Agent 运行时
- [ClawHub](https://clawhub.com) — Skill 市场

## License

MIT
