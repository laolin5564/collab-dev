# Pomodoro — 番茄钟

## 产品定位
专注力工具，帮助用户用番茄工作法管理时间。核心是沉浸式的倒计时体验和丰富的视觉反馈。

## 数据模型
- **私有模型**：每个用户只看到自己的数据
- SSE 仅推送给同用户其他连接（多标签页同步）

## 功能需求

### 认证
- [P0] 注册 / 登录 / 登出

### 计时器
- [P0] SVG 圆环倒计时动画（大尺寸，视觉焦点）
- [P0] 三种模式：专注(25min) / 短休息(5min) / 长休息(15min)
- [P0] 开始 / 暂停 / 重置
- [P0] 倒计时结束提示音 + 视觉闪烁
- [P0] 当前模式用不同颜色渐变区分

### 任务
- [P0] 添加今日任务（名称 + 预估番茄数）
- [P0] 标记任务完成
- [P0] 删除任务
- [P0] 当前专注关联到某个任务

### 统计
- [P0] 今日完成番茄数 + 专注时长
- [P0] 最近7天每日完成番茄数柱状图（纯 CSS/SVG，不用第三方库）
- [P1] 连续专注天数（streak）

### 主题
- [P0] 明亮 / 暗黑 主题切换（带过渡动画）
- [P0] 两套主题的配色方案差异要大（不是简单反色）

### 实时同步
- [P1] SSE 推送计时状态（同用户其他连接同步倒计时）
- [P1] 在线用户总数

## 交互定义
- 弹窗/模态框用 `.hidden` class 控制显隐
- CSS 定义 `.hidden { display: none !important }`
- 主题切换用 `data-theme` 属性在 `<html>` 上

## 安全要求
- 用户输入 trim + 长度限制
- 预估番茄数：正整数 1-20
- 任务名称最长 100 字符

## 搜索策略
- 无搜索功能

## 字段命名统一
- API 和 DB 统一用：taskName, estimatedPomodoros, completedPomodoros, duration, mode, completedAt

## 技术约束
- 单文件 `server.js`（Node.js + Express + better-sqlite3）
- 单文件 `public/index.html`
- JWT + bcrypt（异步）
- SQLite 持久化
- SSE 推送（同用户范围，排除当前连接）
- 端口 `process.env.PORT || 3000`，监听 `0.0.0.0`
- DB 路径 `path.join(__dirname, 'pomodoro.db')`

## 文件结构
```
pomodoro/
├── server.js
├── public/index.html
├── package.json
├── spec.md
└── design.md
```

## API 设计
```
POST /api/auth/register   { username, password } → { token, username }
POST /api/auth/login      { username, password } → { token, username }
GET  /api/tasks            → [{ id, taskName, estimatedPomodoros, completedPomodoros, completed, createdAt }]
POST /api/tasks            { taskName, estimatedPomodoros } → { id, ... }
PUT  /api/tasks/:id        { completed?, taskName? } → { id, ... }
DELETE /api/tasks/:id      → { success }
POST /api/pomodoros        { taskId?, mode, duration } → { id, completedAt }
GET  /api/stats            → { today: { count, minutes }, week: [{ date, count }], streak }
GET  /api/stream           SSE（query: token）
```

## 验收标准
1. [P0] 注册 → 登录 → 看到计时器
2. [P0] 点击开始 → 圆环动画倒计时 → 结束有提示
3. [P0] 三种模式切换，颜色渐变不同
4. [P0] 添加任务 → 关联专注 → 完成标记
5. [P0] 今日统计 + 7天柱状图显示正确
6. [P0] 明暗主题切换有过渡动画
7. [P0] 移动端可用（所有 P0 功能可操作）
