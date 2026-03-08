---
name: collab-dev
description: Multi-agent collaborative development. Gemini designs UI/UX (design spec + presentation code), Claude Code fills business logic (TODO functions only), Codex reviews code quality. Use when user says "协作开发", "collab dev", "multi-agent build", or requests multi-agent collaboration for building web apps. Best for visually intensive projects (dashboards, data viz, animated UIs). For simple CRUD apps, solo development may suffice.
---

# Collaborative Development

## Roles

| Agent | Does | Does NOT |
|-------|------|----------|
| Gemini | design.md + all visible code (CSS/HTML) | write business logic |
| OpenClaw | spec.md + server skeleton + TODO markers + validation + fixes | write UI styles or fill TODOs |
| Claude Code | fill `// TODO` function bodies only | change CSS/HTML structure |
| Codex | write review report | modify any code |

## First Run: Prerequisites Check

On first trigger, check if `~/.openclaw/skills/collab-dev/.ready` exists. If yes, skip to Phase 0. If not, run:

```bash
READY=1

# 1. Gemini CLI
GEMINI=$(which gemini 2>/dev/null)
if [ -n "$GEMINI" ]; then
  echo "✅ Gemini CLI: $($GEMINI --version 2>&1 | head -1)"
else
  echo "❌ Gemini CLI 未安装"; READY=0
fi

# 2. Claude Code CLI
CLAUDE=$(which claude 2>/dev/null)
if [ -n "$CLAUDE" ]; then
  echo "✅ Claude Code: $($CLAUDE --version 2>&1 | head -1)"
else
  echo "❌ Claude Code 未安装"; READY=0
fi

# 3. Codex CLI
CODEX=$(which codex 2>/dev/null)
if [ -n "$CODEX" ]; then
  echo "✅ Codex CLI: $($CODEX --version 2>&1 | head -1)"
else
  echo "❌ Codex CLI 未安装"; READY=0
fi

# 4. ACP config (optional but recommended)
ACPX_CFG="$HOME/.acpx/config.json"
if [ -f "$ACPX_CFG" ]; then
  echo "✅ ACP 配置: $ACPX_CFG"
else
  echo "⚠️ ACP 配置未找到（可选，OpenClaw 内置 ACP 也可用）"
fi
```

If any ❌, show install guide and stop:

| Tool | Install | Auth |
|------|---------|------|
| Gemini CLI | `npm i -g @google/gemini-cli` | `gemini` (首次运行自动引导登录) |
| Claude Code | `npm i -g @anthropic-ai/claude-code` | `claude` (首次运行自动引导登录) |
| Codex CLI | `npm i -g @openai/codex` | `codex` (首次运行自动引导登录) |

Tell user: "装好后再说一次「协作开发」即可。"

**安装遇到问题？** → 读 [references/troubleshooting.md](references/troubleshooting.md)（涵盖 OAuth、ACP 权限、双 auth 不同步、session 堆积等 6 个常见坑）

If all ✅, write marker and proceed:
```bash
touch ~/.openclaw/skills/collab-dev/.ready
```

## Workflow

### Phase -1: PRD (OpenClaw, if needed)

If user only provides a brief idea (e.g. "做一个番茄钟"), generate a PRD first. Read [references/prd-guide.md](references/prd-guide.md) for template and conversion rules.

Steps:
1. Ask user to describe the product idea (or use what they already said)
2. Generate PRD with: user stories, feature list (P0/P1/P2), data model, interaction patterns, acceptance criteria
3. Show PRD to user for confirmation
4. Convert PRD → spec.md (see prd-guide.md §PRD → spec.md Conversion)

Skip if user already provides a detailed spec or PRD.

### Phase 0: Spec (OpenClaw)

Write `spec.md` with:
- Data model (shared vs private)
- Features with priority (P0/P1/P2)
- Interaction: `.hidden` class toggle for modals
- SSE scope + exclude current connection
- Security: enum field whitelists
- Search strategy: server OR client (not both)
- Field naming: API = DB column names
- API design + acceptance criteria

**Do not write UI style hints** — leave design freedom to Gemini.

### Phase 1a: Design Spec (Gemini)

`gemini -p` outputs `design.md`. Prompt must include:
```
1. :root {} CSS variables (colors, sizes, shadows, transitions)
2. HTML class naming for every component
3. Interaction states: .hidden class for all JS show/hide
4. Mobile: keep all P0 features accessible (off-canvas/drawer, no display:none)
```

### Phase 1b: Presentation Code (Gemini)

`gemini -p` outputs `public/index.html`. Prompt rules:
```
1. Names must exactly match design.md
2. No business logic
3. Use .hidden class for JS show/hide, never inline display:none
4. Mobile: drawer/off-canvas for sidebars
```

Clean output: `sed -i '' '1{/^```/d}; ${/^```/d}' public/index.html`

Quality gate: verify design.md names appear in code.

### Phase 2: Infrastructure + Skeleton (OpenClaw)

Write server.js with:
- `path.join(__dirname, 'app.db')` for DB path
- `process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')`
- `await bcrypt.hash()` / `await bcrypt.compare()` (never Sync)
- Prepared statements, enum whitelists, input trim + length limits
- SSE: uuid as map key, online = deduplicated userId count, `broadcastToUser(userId, event, data, excludeConnId)`
- Heartbeat 30s + connection cleanup

Integrate Gemini code:
- Add ids (don't change styles)
- Remove sample data
- Verify `.hidden` class mechanism
- Place empty-state elements **outside** grid containers
- Use event delegation (no inline onclick)

Save snapshot: `cp public/index.html public/index.html.gemini-original`

Inject JS skeleton with `// TODO` markers:
```
// TODO: functionName — description
// Input: params
// 1. step one
// 2. step two
// Output: return value
```

### Phase 3: Logic + Pre-review (parallel)

**3a. Claude Code fills TODOs** (ACP, 5min timeout):
```
Only modify // TODO function bodies.
Do not change CSS/HTML/DO NOT MODIFY blocks.
```
Fallback: if no file change in 3min → kill, OpenClaw fills.

**3b. Codex pre-reviews skeleton** (ACP, simultaneous).

### Phase 4: Automated Validation (OpenClaw)

```bash
# 4a. Completeness
node --check server.js
grep -c "// TODO:" server.js public/index.html  # must be 0

# 4b. Design consistency
# diff design.md names vs code names

# 4c. CSS/JS integration
for cls in hidden loading active; do
  JS=$(grep -c "classList.*'$cls'" public/index.html)
  CSS=$(grep -c "\.$cls" public/index.html)
  [ "$JS" -gt 0 ] && [ "$CSS" -eq 0 ] && echo "⚠️ .$cls missing CSS"
done
grep -n "display: none" public/index.html | grep -v "\.hidden" | grep -v "@media"

# 4d. Security
grep "process.env.JWT_SECRET" server.js        # must exist
grep -c "hashSync\|compareSync" server.js      # must be 0

# 4e. DOM structure
grep -c "onclick=" public/index.html           # target: 0

# 4f. Spec coverage
# check each acceptance criterion: P0 all green
```

### Phase 5: Self-review + Fix

- `diff index.html index.html.gemini-original` — Claude didn't touch presentation
- Fix pre-review issues
- Verify mobile, brand elements, port/config

### Phase 6: Codex Final Review (ACP)

Dimensions: functionality, design consistency, security, code quality, performance, bug risk (1-10 each).

### Phase 7-8: Fix + Ship

Fix Critical/High from review → re-validate → deliver.

## Known Issues

| Issue | Workaround |
|-------|-----------|
| Gemini ACP unavailable | Always use `gemini -p` CLI |
| Gemini markdown wrapping | Phase 1b: sed cleanup |
| Claude ACP hangs | 5min timeout + fallback |
| Claude modifies presentation | Phase 5 diff check |
| Standard tool projects: Gemini adds little value | Best for visually intensive projects |
