# AGENTS.md — nexbaron-hub

Customer-facing portal where users manage their Nexbaron account (orders, progress, chat, settings). Vite SPA. Consumes `/{division}/*` customer-authenticated routes through the `nexbaron-api` gateway (`/Users/nishantkumar/dev/nexbaron-api`).

## Commands

```bash
npm run dev          # vite on port 5173
npm run build       # tsc --noEmit && vite build
npm run typecheck   # tsc --noEmit  <- use this to verify changes
```

No tests, no linter.

## Architecture

- **React 18 + TypeScript 5 (strict) + Vite 5 + react-router-dom v6** (BrowserRouter). Tailwind 3. Icons: lucide-react.
- **Auth**: Bearer JWT from `nexbaron-auth-token-{division}` in localStorage. `AuthProvider` in `src/auth/auth-context.tsx` manages sign-in/sign-out via `lib/api.ts`.
- **API layer**: `apiRequest<T>()` from `src/lib/api.ts` — native fetch, Bearer token, division-scoped.
- Division-aware routing: `/digital/*` and `/print/*` both served by same codebase.

### Theming

CSS-variable tokens (`--accent-color`, `--accent`, `--border`, `--bg`, `--heading`, `--muted`, `--surface`). Two palettes: digital (teal) / print (amber), both support light/dark via `data-theme` attribute. `DivisionProvider` in `src/theme/theme-provider.tsx` sets division colors; `ThemeProvider` manages light/dark toggle.

**Theme rules (MUST follow):**
- Never use hardcoded dark-mode-only colors: avoid `text-white`, `text-slate-*`, `bg-slate-900`, `bg-slate-950`, `border-white/*`.
- Always use theme tokens: `text-heading`, `text-muted`, `bg-neutral-bg`, `bg-neutral-surface`, `border-border`.
- Exception: `text-white` is allowed only on `bg-accent` buttons/badges (always contrast-safe).
- Before creating any new page/component, reference `Dashboard.tsx` or `Orders.tsx` for correct theme class usage.

### Conventions

- Path alias `@/*` -> `src/*`.
- Pages: `PascalCase.tsx` with default export.
- Forms: controlled `useState` fields + async `onSubmit`.
- Dates: `toLocaleDateString("en-IN")`.

## Git

Branch `main`, imperative feature-sized commits.

### Brand Logo

The official Nexbaron logo is an NX monogram — two vertical strokes + diagonal inside a rounded square with gradient border. Source: `nexbaron-web/public/icon.svg`. Digital = teal gradient, Print = amber gradient. Never use a plain "N" or text-based fallback.

The official logo is `public/icon.svg` — NX monogram in a rounded square with gradient border.
Corporate: teal→amber gradient. Digital: teal icon on teal gradient. Print: amber icon on amber gradient.

**Rules:**

- Every email template, PDF, or external asset must use this logo.
- `components/brand/brand-mark.tsx` is the canonical React component.
- Never create a different logo or text-based fallback.

## Design Standards

You are a world-class UX/UI designer. Every interface you build must reflect this.

### Layout
- Never stack everything in a single column. Use proper grid layouts (2-col, 3-col, 5-col depending on content).
- Primary content on the left/wider column, secondary/summary on the right/skinnier column.
- Page headers are clean: title + one-line description, no clutter.

### Surfaces
- Cards use `rounded-2xl` (not `rounded-lg`), `bg-neutral-surface`, `border border-border`.
- Tables and lists use `rounded-2xl overflow-hidden` with `divide-y divide-border/60`.
- Empty states: centred icon + title + description, never bare text.

### Typography
- Headings: `text-2xl font-bold text-heading`.
- Body: `text-sm text-body` or `text-heading`.
- Muted/secondary: `text-xs text-muted`.
- Never use font sizes below `text-[10px]` for badges/labels; `text-xs` for descriptions.

### Spacing
- Section gap: `space-y-6` or `space-y-8`.
- Card padding: `p-6` inside, `px-5 py-3.5` for rows.
- Grid gap: `gap-6` for main sections, `gap-4` for stat cards.

### States
- Loading: centred spinner (`animate-spin`), never bare "Loading..." text.
- Empty: rounded-2xl card with icon + message.
- Error: bordered card with message + retry.

### Buttons
- Primary: `bg-accent text-white rounded-xl font-bold hover:opacity-90`.
- Outline/secondary: `border border-muted rounded-xl`.
- Never use raw `<button>` without these classes.

### Animations
- Hover cards: `hover:border-accent/30 transition-colors`.
- Buttons: `transition-opacity` or `transition-all`.
- Progress bars: `transition-all duration-700`.
- List items: `hover:bg-neutral-bg transition-colors`.

### Forms
- Inputs always: `px-3 py-2.5 bg-neutral-bg border border-border rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50`.
- Labels: `text-xs text-muted` above the input.
- Modals: centred with `bg-black/50 backdrop-blur-sm` overlay.

### Detail panels (CRM)
- Width: `w-96`, pinned right (`border-l border-border`), `bg-neutral-bg`.
- Close button: `X` icon top-right, `w-8 h-8 rounded-lg hover:bg-neutral-surface`.
- Sections separated by `border-t border-border pt-4`.

### App Shell Layout

For CRM and Hub: **sidebar + topbar fixed, content scrolls independently.**

- Root wrapper: `h-screen flex bg-neutral-bg overflow-hidden` (NOT `min-h-screen`).
- Sidebar: fixed left, `h-full`.
- Main area: `flex-1 flex flex-col overflow-hidden`.
- Content: `flex-1 overflow-auto` — this is the ONLY element that scrolls.
- Topbar: inside main, fixed height, never scrolls.

This is the Stripe / Linear / Vercel pattern.

### Clickable Elements

Every interactive element must have a cursor pointer:

- `<button>` — natively gets `cursor: pointer`, no extra class needed.
- `<a href="...">` — natively gets `cursor: pointer`, no extra class needed.
- `<div onClick={...}>`, `<span onClick={...}>`, `<tr onClick={...}>` — must include `cursor-pointer`.
- Any element with `onClick` that is not a native `<button>` or `<a>` — must include `cursor-pointer`.
- `hover:` transitions on clickable rows: `hover:bg-neutral-bg cursor-pointer transition-colors`.

### Data Source of Truth

- **API is the single source of truth for ALL data.** Never hardcode prices, plan names, service lists, statuses, milestones, or any business data in the frontend.
- When building a feature that spans repos: always start with the API. Define the data model, the endpoint response shape, and the status flow FIRST. Then update all clients (web, hub, crm) to consume that data as-is.
- Frontend must display exactly what the API returns. No client-side mapping, no hardcoded defaults for business data, no fallback arrays for plan services or pricing.
- If a feature needs new data from the API, add the endpoint/field to the API first, then update all clients to use it.
- NEVER hardcode plan names ("Launch"), service lists, prices, progress percentages, or milestone labels. Read everything from the API response.

### Pre-Push Checklist

After every code change, run the build/typecheck before pushing:

- **API**: `npx tsc --noEmit`
- **Hub**: `npx tsc --noEmit`
- **CRM**: `npx tsc --noEmit`
- **Web**: `npm run build` (catches type errors + lint + format)

Never push code that fails the build. If a parser error occurs (OXC/Vite), verify with `npx tsc --noEmit` first — it catches real issues the bundler may miss.
