# Pomodoro 对比审查报告

> 审查日期：2026-03-08
> 版本 A：`pomodoro/`（协作版） | 版本 B：`pomodoro-solo/`（对照版）
> 共同 spec：相同的 `spec.md`

---

## 评分总览

| 维度 | 版本 A | 版本 B | 说明 |
|------|:------:|:------:|------|
| 功能完整性 | **8** | **7** | A 多 skip 按钮但缺 streak UI；B 有 streak 显示和任务下拉选择器但模式值偏离 spec |
| 设计一致性 | **9** | **6** | A 有 design.md 并严格遵循；B 无设计规范，自成体系但缺渐变 |
| 安全性 | **8** | **6** | A 验证更严格、查询更防御；B 密码最低 4 字符、duration 无上限 |
| 代码质量 | **8** | **6** | A 预编译语句+分段组织；B N+1 查询+inline onclick |
| 性能 | **9** | **5** | A 有索引+高效 SQL；B 无索引、streak 无界循环 |
| Bug 风险 | **7** | **5** | A 有 logout 按钮 class 重复等小问题；B 有 streak 性能炸弹和模式值不一致 |
| **合计** | **49** | **35** | |

---

## 1. 功能完整性

### 版本 A（8/10）

**覆盖的 P0 功能：**
- 注册/登录/登出 ✓
- SVG 圆环倒计时 + 渐变色区分三种模式 ✓
- 开始/暂停/重置 + **额外的跳过按钮** ✓
- 倒计时结束提示音（单次 800Hz） ✓
- 任务 CRUD + 点击 ▶ 关联当前专注 ✓
- 今日统计 + 7 天柱状图 ✓
- 明暗主题切换（CSS transition） ✓
- SSE 多标签页同步 + 在线人数 ✓

**缺失/不足：**
- 后端计算了 streak 但**前端未显示**（P1 功能丢失）
- `screen-flash` 元素存在于 HTML 但 JS 从未触发（spec 要求"视觉闪烁"未生效）
- 提示音仅单次短促 beep，体验较弱

### 版本 B（7/10）

**覆盖的 P0 功能：**
- 注册/登录/登出（全屏认证页面，非模态框） ✓
- SVG 圆环倒计时 ✓
- 开始/暂停/重置 ✓
- 倒计时结束提示音（3 声渐弱 beep，效果更好）+ 闪烁动画 ✓
- 任务 CRUD + **下拉选择器**关联任务 ✓
- 今日统计 + 7 天柱状图 + **streak 显示** ✓
- 明暗主题切换 ✓
- SSE 同步 + 在线人数 ✓

**缺失/不足：**
- **模式值与 spec 不一致**：使用 `shortBreak`/`longBreak` 而非 spec 定义的 `short`/`long`，破坏了 API 契约
- 模式颜色为纯色而非 spec 要求的"颜色渐变"
- 运行中禁止切换模式（spec 未要求此限制）
- 无跳过按钮

---

## 2. 设计一致性

### 版本 A（9/10）

- 拥有独立 `design.md` 设计规范，CSS 变量与规范精确匹配
- 渐变色系统：Focus `#FF6B6B→#FF8E53` / Short `#4ECDC4→#556270` / Long `#6C5CE7→#A29BFE`
- 桌面端双栏布局（`1.2fr 0.8fr`），移动端单栏
- SVG 尺寸严格按 design.md：桌面 320px，移动 260px
- 阴影 token、圆角系统、间距体系一致
- 唯一瑕疵：按钮 active 状态的 `scale` 数值略有不一致（0.9 vs 0.95）

### 版本 B（6/10）

- **无设计规范文档**，视觉体系自行定义
- 单栏布局（`max-width: 480px`），移动优先但无桌面端拓展
- 颜色系统用纯色而非渐变，与 spec "颜色渐变不同" 要求不符
- 明暗主题差异较大（深蓝底 vs 暖灰底），这点做得好
- 主题图标用 emoji（🌙/☀️）而非 SVG，风格略显粗糙
- 内部设计体系自洽，但与 spec 的交互定义有偏差（认证用全屏而非模态框）

---

## 3. 安全性

### 版本 A（8/10）

| 检查项 | 状态 |
|--------|------|
| 用户名验证 | 2-20 字符 + 正则 `[a-zA-Z0-9_\u4e00-\u9fff]+` ✓ |
| 密码长度 | 6-50 字符 ✓ |
| 任务名长度 | 1-100 字符 ✓ |
| 番茄数范围 | 1-20 ✓ |
| 时长范围 | 1-60 分钟 ✓ |
| SQL 注入防护 | 预编译参数化语句 ✓ |
| XSS 防护 | `escapeHtml()` 正则替换 ✓ |
| 所有权校验 | DELETE/UPDATE 的 WHERE 子句包含 userId（纵深防御） ✓ |
| JWT 密钥 | 环境变量或随机生成 ✓ |

**注意点：**
- 使用 `bcryptjs`（纯 JS 实现），跨平台但比 native bcrypt 慢
- SSE 端点 token 通过 query string 传递（SSE 的标准做法，可接受）

### 版本 B（6/10）

| 检查项 | 状态 |
|--------|------|
| 用户名验证 | 1-50 字符，仅 trim，**无格式校验** ⚠️ |
| 密码长度 | **4-100 字符（过低）** ⚠️ |
| 任务名长度 | max 100 ✓ |
| 番茄数范围 | 1-20 ✓ |
| 时长范围 | **仅 ≥1，无上限** ⚠️（可传入 999999） |
| SQL 注入防护 | 参数化查询 ✓ |
| XSS 防护 | DOM `createElement` 方式（实际更安全） ✓ |
| 所有权校验 | SELECT 检查后 DELETE/UPDATE **不带 userId**（依赖先验检查） ⚠️ |

**关键问题：**
- 密码最短 4 字符，安全性不足
- `duration` 无上限，恶意请求可写入极大数值
- DELETE 语句 `DELETE FROM tasks WHERE id = ?` 不含 `userId`，虽然先做了 SELECT 验证，但缺少纵深防御

---

## 4. 代码质量

### 版本 A（8/10）

**优点：**
- 预编译 `stmt` 对象集中管理所有 SQL（`server.js:55-72`），清晰且性能好
- 代码分段用 `// ─── Section ───` 注释，结构清晰
- SSE 管理用 `Map<connId, {res, userId}>`，扁平结构，查询简洁
- 事件委托模式处理 task-list 点击（`taskList.addEventListener`）
- `escapeHtml` 覆盖 `& < > "`
- 前端 244 行 server + 1007 行 HTML，代码量适中

**不足：**
- 部分变量命名过于简短：`h`（auth header）、`t`（toast div）
- 多处 `DO NOT MODIFY` 注释暗示协作约束，但缺少 why 的说明

### 版本 B（6/10）

**优点：**
- 认证流程完整（全屏视图切换，Enter 键支持）
- `updateTaskSelect()` 保持下拉选择器同步
- 提示音实现更精细（3 声渐弱）
- `escapeHtml` 用 DOM 方式，天然安全

**不足：**
- **SQL 语句全部内联**：`db.prepare('...')` 散布在各处理函数中，重复且难维护
- **N+1 查询**：`/api/stats` 的 week 数据用 7 次单独查询（`server.js:229-238`），而非一次 GROUP BY
- **streak 计算**：`while(true)` 循环逐日查询（`server.js:242-255`），效率极差
- 使用 `inline onclick` 处理器（`onclick="toggleTask(...)"`），不利于维护和 CSP
- `startBtn` 样式切换通过 `element.style.xxx` 手动设置，而非 CSS class 切换

---

## 5. 性能

### 版本 A（9/10）

- **数据库索引**：`idx_tasks_user`、`idx_pomodoros_user`、`idx_pomodoros_date` ✓
- **预编译语句**：所有 SQL 在启动时编译一次 ✓
- **高效统计**：week 数据用单次 `GROUP BY` 查询；streak 用单次排序查询后 JS 计算
- **SSE 心跳**：每 30 秒发送 heartbeat，防止连接被代理/防火墙断开 ✓
- 前端 `circumference` 预计算（`2 * Math.PI * 140`）

### 版本 B（5/10）

- **无数据库索引** ✗ —— 随着数据量增长，`userId` 和 `completedAt` 上的查询将全表扫描
- **week 统计 N+1**：7 次独立 SQL 查询 ✗
- **streak 无界循环**：`while(true)` 逐日查 COUNT，若用户连续使用 365 天 → 365 次 SQL 查询 ✗✗
- **无 SSE 心跳** ✗ —— 连接可能被中间件静默断开，客户端不感知
- 每次渲染任务列表时 `escapeHtml` 创建临时 DOM 元素（微小开销）

---

## 6. Bug 风险

### 版本 A（7/10）

| Bug | 严重性 | 位置 |
|-----|--------|------|
| `btn-logout` 有两个 `class` 属性 | 中 | `index.html:554` — `class="btn-text"` 和 `class="hidden"` 重复，浏览器忽略第二个，导致**退出按钮始终可见** |
| `screen-flash` 未触发 | 低 | HTML 中存在该元素但 JS 从未操作其 opacity，"视觉闪烁"功能失效 |
| Skip 按钮边界 | 低 | `timeLeft = 0; if (!isRunning) startTimer()` → timeLeft 会瞬间到 -1 再触发完成逻辑，虽然功能正常但逻辑不严谨 |
| 时区不一致 | 中 | streak 计算用 JS `new Date()`（本地时区）对比 DB `datetime('now')`（UTC），跨时区部署会导致 streak 计算错误 |
| completePomodoro 后双重 reset | 低 | `startTimer` 的 interval 回调结束时调用 `resetTimer()`，`completePomodoro` 后也会走到 `resetTimer()` |

### 版本 B（5/10）

| Bug | 严重性 | 位置 |
|-----|--------|------|
| **模式值与 spec 不匹配** | 高 | server 用 `['focus','shortBreak','longBreak']`，spec 定义 `['focus','short','long']`，任何依赖 spec 的外部集成都会失败 |
| **streak 性能炸弹** | 高 | `server.js:242-255` — 无界 while 循环逐日查询，长期用户可触发大量 SQL |
| stats 时区差异 | 中 | `server.js:220` 用 JS `new Date().toISOString().slice(0,10)` 获取"今天"（UTC），但用户可能在 UTC+8，导致统计日期偏移 |
| SSE 无心跳导致幽灵连接 | 中 | 无 heartbeat，Nginx/CDN 等代理可能 60s 超时断开 SSE，客户端依赖浏览器自动重连（不可靠） |
| SSE `onerror` 未重连 | 中 | `eventSource.onerror` 为空（注释说"Will auto-reconnect"），但某些错误会使 EventSource 进入 CLOSED 状态而不自动重连 |
| `connectionIdCounter` 溢出 | 极低 | 理论上超过 `Number.MAX_SAFE_INTEGER` 后 ID 不唯一，实际不可能发生 |

---

## 亮点对比

| 特性 | 版本 A 更优 | 版本 B 更优 |
|------|:-----------:|:-----------:|
| 设计规范完整度 | ✓ | |
| 渐变色模式区分 | ✓ | |
| 数据库索引 | ✓ | |
| SQL 效率 | ✓ | |
| SSE 心跳 | ✓ | |
| 纵深防御 | ✓ | |
| Streak 展示 | | ✓ |
| 任务选择器 UX | | ✓ |
| 提示音效果 | | ✓ |
| 认证 Enter 键 | | ✓ |
| XSS 防护方式 | | ✓ |
| 完成闪烁动画 | | ✓ |

---

## 改进建议

### 版本 A 优先修复
1. **`index.html:554`** — 删除 `btn-logout` 的重复 `class` 属性，合并为 `class="btn-text hidden"`
2. **前端显示 streak** — 后端已返回 `streak` 字段，stats-summary 增加第三个 stat-box
3. **实现 screen-flash** — 在 `completePomodoro()` 中给 `.screen-flash` 加 opacity 动画
4. **提示音增强** — 参考 B 的 3 声渐弱模式

### 版本 B 优先修复
1. **模式值对齐 spec** — 将 `shortBreak`→`short`、`longBreak`→`long`（前后端同步修改）
2. **添加数据库索引** — `CREATE INDEX idx_tasks_user ON tasks(userId)` 等
3. **重写 stats 查询** — week 用 `GROUP BY date(completedAt)` 一次查完；streak 用排序后 JS 计算
4. **SSE 心跳** — `setInterval(() => res.write(': heartbeat\n\n'), 30000)`
5. **加强输入验证** — 密码最低 6 字符、duration 上限 60、用户名格式校验
6. **SSE 重连逻辑** — `onerror` 中关闭后 `setTimeout(connectSSE, 3000)`

---

## 结论

版本 A 在工程质量上明显领先：有完整设计规范、更严格的安全验证、高效的数据库设计、以及防御性的编码风格。主要短板是几个小 bug（logout 按钮显示、screen-flash 未接入）和缺少 streak UI 显示。

版本 B 在部分 UX 细节上更好（任务下拉选择器、streak 显示、完成动画和音效），但存在性能隐患（无索引、streak 无界循环）、安全薄弱（密码和 duration 验证不足）、以及 spec 偏离（模式值命名不一致）等结构性问题。
