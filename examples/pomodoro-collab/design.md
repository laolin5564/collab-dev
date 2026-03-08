I will now create the `design.md` specification, defining a high-fidelity visual system with distinct light and dark themes, mode-specific color palettes, and detailed specifications for the SVG components and animations.

```markdown
# Pomodoro Design Specification

## 1. Design Philosophy
A "Vivid Minimalist" aesthetic. The interface uses generous whitespace and clean typography to reduce cognitive load, while employing bold, functional gradients to signal state changes. The UI should feel "alive" through subtle micro-interactions and smooth state transitions.

## 2. Color System & Tokens

### 2.1 Base Tokens (CSS Variables)
```css
:root {
  /* Light Theme - Fresh & Airy */
  --bg-app: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-input: #F1F5F9;
  
  --text-main: #1E293B;
  --text-muted: #64748B;
  --text-on-accent: #FFFFFF;
  
  --border: #E2E8F0;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Functional Colors (Default Focus Mode) */
  --accent-primary: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
  --accent-glow: rgba(255, 107, 107, 0.3);
  
  /* Transitions */
  --transition-speed: 0.3s;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme='dark'] {
  /* Dark Theme - Deep & Neon */
  --bg-app: #0F172A;
  --bg-card: #1E293B;
  --bg-input: #334155;
  
  --text-main: #F8FAFC;
  --text-muted: #94A3B8;
  --text-on-accent: #FFFFFF;
  
  --border: #334155;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.5);

  /* Overriding Functional for Dark */
  --accent-glow: rgba(255, 107, 107, 0.15);
}
```

### 2.2 Mode Color Schemes
These variables override `--accent-primary` and `--accent-glow` based on the active mode.

| Mode | Theme | Gradient Palette | Glow/Shadow Color |
| :--- | :--- | :--- | :--- |
| **Focus** | Warm | `#FF6B6B` → `#FF8E53` | `rgba(255, 107, 107, 0.4)` |
| **Short Break** | Cool | `#4ECDC4` → `#556270` | `rgba(78, 205, 196, 0.4)` |
| **Long Break** | Deep | `#6C5CE7` → `#A29BFE` | `rgba(108, 92, 231, 0.4)` |

## 3. SVG Timer Specifications

### 3.1 Dimensions & Geometry
- **Outer Container**: 320px x 320px (Desktop), 260px x 260px (Mobile).
- **Circle Radius**: 140px.
- **Stroke Width**: 12px (Round linecap).
- **Layers**:
    1. **Track**: Low opacity version of the accent color (e.g., `opacity: 0.1`).
    2. **Progress**: Dynamic `stroke-dashoffset` using the current accent gradient.

### 3.2 Animation Logic
- **Progress**: Use `stroke-dasharray` and `stroke-dashoffset`.
- **CSS Formula**: `stroke-dashoffset: calc(880 * (1 - var(--progress)))`.
- **Center Text**: Large, bold font-weight (700) with tabular-nums to prevent jumping digits.

## 4. Statistics: 7-Day Bar Chart (Pure CSS)

### 4.1 Structure
- **Container**: Flexbox with `align-items: flex-end`.
- **Bar**: A `div` with a height percentage set via inline style.
- **Styling**:
    - `background: var(--accent-primary)`.
    - `border-radius: 4px 4px 0 0`.
    - `transition: height 0.6s var(--ease)`.
- **Empty State**: Dotted line at 0 level using `border-top`.

## 5. UI Components & Layout

### 5.1 HTML Class Naming Conventions
- **Layout**: `.app-container`, `.main-content`, `.sidebar-stats`.
- **Modules**: `.timer-module`, `.task-module`, `.auth-modal`.
- **States**: `.is-active`, `.is-completed`, `.is-running`.
- **Utility**: `.hidden { display: none !important; }`.

### 5.2 Responsive Breakpoints
- **Mobile (< 640px)**: Single column. Timer occupies top half. Task list bottom half. Floating Action Button (FAB) for adding tasks.
- **Desktop (>= 1024px)**: Two-column grid. Left: Timer (large). Right: Task List + Stats.

## 6. Motion & Transitions

### 6.1 Theme Switch
- Apply `transition: background-color var(--transition-speed), color var(--transition-speed)` to `body` and all card elements.
- Icon rotation (Sun/Moon) 360deg on toggle.

### 6.2 Interaction Feedback
- **Buttons**: `active { transform: scale(0.95); }`.
- **Timer Start**: Circle progress stroke pulses slightly when running.
- **Completion**: Screen flash using a full-screen overlay with the mode's accent color at 10% opacity for 500ms.

### 6.3 Task Animations
- **Add**: Slide in from bottom + Fade in.
- **Complete**: Strikethrough animation + checkmark scale up.
- **Delete**: Slide out to right + Fade out.

## 7. Accessibility & Safety
- **Contrast**: All text on `--bg-card` must meet WCAG AA standards.
- **Focus States**: Clearly visible ring using `outline: 2px solid var(--accent-glow)`.
- **Inputs**: Max-width constraints on task names; numeric inputs restricted to 1-20.
```
