# PRD Generation Guide

## When to Use

Before Phase 0, when the user only provides a brief idea (e.g. "做一个番茄钟") without detailed requirements.

## PRD Template

Generate the following sections. Keep it concise — this PRD feeds directly into spec.md.

### 1. Product Overview (2-3 sentences)
- What is this product?
- Who is the target user?
- What core problem does it solve?

### 2. User Stories (3-8 stories)

Format:
```
作为[角色]，我希望[目标]，以便[价值]
验收标准：
- [具体可测试的条件]
```

Prioritize with MoSCoW:
- **Must have (P0)**: Product unusable without it
- **Should have (P1)**: Important but not blocking
- **Could have (P2)**: Nice to have

### 3. Feature List

| Feature | Priority | Description |
|---------|----------|-------------|
| ... | P0 | ... |

### 4. Data Model

- Shared (all users see same data) or Private (each user owns their data)?
- Key entities and relationships

### 5. Interaction Patterns

- How do modals/overlays work? (`.hidden` class toggle)
- What happens on success/error?
- Mobile behavior for complex layouts?

### 6. Non-functional Requirements

- Security: input validation rules, auth method
- Performance: expected concurrent users
- Real-time: what needs SSE/WebSocket?

### 7. Acceptance Criteria

Numbered list, each testable:
```
1. [P0] User can register → login → see main screen
2. [P0] ...
```

## PRD → spec.md Conversion

After PRD is generated, extract into spec.md format:

1. **Data model** → from PRD §4
2. **Features with P0/P1/P2** → from PRD §3
3. **Interaction** → from PRD §5 (standardize to `.hidden` class)
4. **Security** → from PRD §6
5. **API design** → derive from features + data model
6. **Field naming** → API field = DB column name
7. **Search strategy** → server OR client (pick one)
8. **Acceptance criteria** → from PRD §7

**Do not copy UI style hints into spec.md** — leave design freedom to Gemini.
