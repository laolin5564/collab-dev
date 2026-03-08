# Pomodoro Code Review

审查时间：2026-03-08  
范围：版本 A `projects/pomodoro`，版本 B `projects/pomodoro-solo`

## 结论

版本 A 更适合作为主线基础版：后端契约、字段命名、索引和 SSE 可靠性都更接近规格。  
版本 B 的登录流和统计展示更完整，但它在模式命名、统计实现和设计落地上偏离规格更明显，后续修正成本更高。

## Findings

1. **[高] 版本 B 的模式命名已经偏离共享规格，前后端虽然自洽，但 API 契约不兼容。**  
   `pomodoro-solo/server.js:195` 只接受 `focus / shortBreak / longBreak`；`pomodoro-solo/public/index.html:293` 和 `pomodoro-solo/public/index.html:294` 也发送这两个值。  
   但规格要求统一字段命名，模式应与既定 API/DB 契约保持一致，见 `pomodoro-solo/spec.md:55` 和 `pomodoro-solo/spec.md:84`。这会让对照版无法直接替换协作版，也让后续客户端或数据分析层出现分叉。

2. **[高] 版本 A 的“倒计时结束提示音 + 视觉闪烁”只在登录态的专注模式下成立，P0 计时器行为不完整。**  
   `pomodoro/public/index.html:772` 只有 `focus && token` 才调用 `completePomodoro()`；而提示音逻辑在 `pomodoro/public/index.html:812` 之后，视觉闪烁并未触发。  
   非专注模式只会 `showToast('计时结束！')`，见 `pomodoro/public/index.html:774`。  
   设计稿要求完成时有 screen flash，见 `pomodoro/design.md:113`；页面虽然定义并渲染了 `.screen-flash`，见 `pomodoro/public/index.html:515` 和 `pomodoro/public/index.html:538`，但脚本没有使用它。

3. **[中高] 版本 A 的任务更新接口允许客户端直接写入任意 `completedPomodoros`，并且没有重新校验 `taskName`。**  
   `pomodoro/server.js:162` 到 `pomodoro/server.js:165` 直接采信 `req.body.completedPomodoros` 和 `taskName`。  
   恶意或异常客户端可以把已完成番茄数改成负数、超大值，甚至把名称改成空串，破坏统计与 UI 展示。这是数据完整性问题，也是 A 当前最明显的后端安全缺口。

4. **[中] 版本 B 的统计实现既更慢，也更容易算错 streak。**  
   `pomodoro-solo/server.js:227` 到 `pomodoro-solo/server.js:238` 为最近 7 天执行了 7 次单独查询；`pomodoro-solo/server.js:241` 到 `pomodoro-solo/server.js:255` 又按天循环查询 streak，复杂度与连续天数线性相关。  
   更重要的是，这段 streak 逻辑从“今天”开始，若今天还没完成番茄但昨天有记录，会直接返回 0；A 在 `pomodoro/server.js:218` 到 `pomodoro/server.js:221` 处理了这个边界。

5. **[中] 版本 A 登出后仍保留上一位用户的统计视图，私有数据不会立即从界面消失。**  
   `pomodoro/public/index.html:957` 到 `pomodoro/public/index.html:962` 登出时只清 token、SSE 和任务列表，没有重置统计数字、在线人数或当前选中任务。  
   在共享设备上，这会把上一个用户的专注数据继续留在页面上。B 的 `showAuth()` 会直接隐藏应用主界面，见 `pomodoro-solo/public/index.html:431` 到 `pomodoro-solo/public/index.html:475`，处理更干净。

6. **[中] 两个版本都没有实现规格里的“倒计时状态跨标签同步”，只同步了结果事件。**  
   A 的 SSE 只广播 `task-changed / pomodoro-completed / online-count`，见 `pomodoro/server.js:155`、`pomodoro/server.js:199`、`pomodoro/server.js:92`。  
   B 只广播 `tasksUpdated / pomodoroCompleted / onlineCount`，见 `pomodoro-solo/server.js:159`、`pomodoro-solo/server.js:213`、`pomodoro-solo/server.js:72`。  
   规格要求的是“同用户其他连接同步倒计时”，见两份 `spec.md:38`。

7. **[中] 版本 B 大量吞掉异常，线上故障会静默失效，排查成本明显更高。**  
   `pomodoro-solo/public/index.html:565`、`pomodoro-solo/public/index.html:574`、`pomodoro-solo/public/index.html:615`、`pomodoro-solo/public/index.html:621`、`pomodoro-solo/public/index.html:627`、`pomodoro-solo/public/index.html:641` 都是空 `catch {}`。  
   一旦接口 4xx/5xx、SSE 不稳或 token 失效，用户只会看到“不更新”，不会得到明确反馈。A 至少统一用 toast 暴露失败，见 `pomodoro/public/index.html:850`、`pomodoro/public/index.html:875`、`pomodoro/public/index.html:988`。

8. **[中] 版本 B 在安全与输入边界上也比 A 更松，且偏离规格。**  
   `pomodoro-solo/server.js:103` 允许用户名 1-50 字符，`pomodoro-solo/server.js:104` 允许密码 4-100 字符；规格要求见 `pomodoro-solo/spec.md:47` 到 `pomodoro-solo/spec.md:49`，而 A 的实现也更贴近这些限制，见 `pomodoro/server.js:103` 到 `pomodoro/server.js:107`。  
   这不一定马上导致漏洞，但会造成产品规则漂移和脏数据输入。

9. **[中] 版本 A 的功能更贴规格，但 UI 仍漏了 streak 展示和部分 API 返回结构。**  
   `pomodoro/server.js:227` 已返回 `streak`，但前端统计区只渲染了两个指标，见 `pomodoro/public/index.html:632` 到 `pomodoro/public/index.html:643`，以及 `pomodoro/public/index.html:857` 到 `pomodoro/public/index.html:873`。  
   此外，A 的 `PUT /api/tasks/:id` 和 `POST /api/pomodoros` 返回 `{ ok: true }`，见 `pomodoro/server.js:168` 和 `pomodoro/server.js:200`，与规格中的对象返回约定不一致，见 `pomodoro/spec.md:82` 到 `pomodoro/spec.md:85`。

10. **[低] 设计一致性上，A 明显领先于 B，但 A 也没有完整落地 `design.md`。**  
   A 实现了大部分色板、渐变、桌面双栏和 320/260 的 SVG 尺寸，见 `pomodoro/public/index.html:24` 到 `pomodoro/public/index.html:27`、`pomodoro/public/index.html:151` 到 `pomodoro/public/index.html:154`、`pomodoro/public/index.html:199` 到 `pomodoro/public/index.html:207`。  
   但 `design.md` 提到的 FAB、运行时 pulse、任务增删动画没有落地，见 `pomodoro/design.md:101`、`pomodoro/design.md:112`、`pomodoro/design.md:116`。  
   B 基本没有沿用这套视觉系统，整体是固定 `max-width: 480px` 的移动端卡片布局，见 `pomodoro-solo/public/index.html:49`，颜色也改成纯色而非渐变，见 `pomodoro-solo/public/index.html:15` 到 `pomodoro-solo/public/index.html:18`。

## 评分（1-10）

| 维度 | 版本 A（协作版） | 版本 B（对照版） | 评语 |
|---|---:|---:|---|
| 功能完整性 | 7 | 6 | A 更接近规格，但缺少 streak 展示且计时完成反馈不完整；B 有 streak UI，但模式契约偏离规格，streak 逻辑也有边界问题。 |
| 设计一致性 | 8 | 5 | A 基本按 `design.md` 落地；B 是另一套可用界面，但和既定视觉规范差距较大。 |
| 安全性 | 6 | 5 | A 主要问题是任务更新接口校验缺失；B 的输入边界更松，规则漂移更明显。 |
| 代码质量 | 7 | 5 | A 有预编译语句、统一错误提示和更清晰的契约；B 有较多重复 `prepare`、内联事件和空 `catch`。 |
| 性能 | 8 | 5 | A 有索引、聚合查询和 SSE heartbeat；B 无索引，统计查询次数明显更多。 |
| Bug 风险 | 6 | 5 | A 的风险集中在完成反馈和登出残留状态；B 的风险集中在契约分叉、静默失败和 streak 边界。 |

## 总评

- **推荐保留 A 作为主线**：它更贴近共享规格，后端也更稳，修复点主要是补前端行为和收紧任务更新接口。
- **B 的可取之处**：认证视图切换更完整，streak 也真正显示到了 UI 上，适合挑选交互细节反向吸收。
- **如果只修一版**：优先修 A。A 到可交付状态的路径更短；B 需要先统一模式命名、修统计实现，再谈合并。

## 测试与证据

- 已做静态审查，并执行 `node --check` 验证两份 `server.js` 语法通过。
- 两个项目目录下都**未发现自动化测试文件或 test script**；当前关于计时结束、SSE、统计口径的行为都没有回归保护。
