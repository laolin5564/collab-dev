# Changelog

## v9.0.0 (2026-03-08)

- 首次运行环境检查 + `.ready` 标记
- 踩坑记录移至 `references/troubleshooting.md`（渐进式加载）
- Solo vs 协作对照截图

### 从双 Review（Codex + Claude Code）中提取的改进
- Phase 0: spec 不写 UI 风格提示；统一字段命名；明确搜索策略
- Phase 1: Gemini prompt 加移动端铁律
- Phase 2: bcrypt 异步；SSE 排除当前连接；空状态放 grid 外；事件委托
- Phase 4: 检查无效 CSS 属性；DOM 结构验证

## v8.0.0 (2026-03-08)

- 安全模板（JWT env var + 枚举白名单 + 参数化查询）
- CSS/JS 集成检查（Phase 4c）
- Codex Review 驱动的迭代

## v7.0.0 (2026-03-08)

- Phase 1 拆两步（先 design.md 再 HTML）→ 设计一致性 4→9 分
- Gemini 快照保存（Phase 5 diff 验证）

## v4.0.0 (2026-03-08)

- 🚀 突破：Gemini 直接写 UI 代码
- 用户首次选协作版

## v1.0.0 (2026-03-08)

- 初始版本：Gemini 设计 → Claude 编码 → Codex 审查
