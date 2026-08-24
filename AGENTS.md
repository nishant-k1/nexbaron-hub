# AGENTS.md — nexbaron-hub

> **Root contract:** See `nexbaron/AGENTS.md` §0 — **API is single source of truth (MANDATORY).** `nexbaron-hub` must never hardcode prices, statuses, plan names, breakdowns, installments, or any business logic. If you need a computed field (`summary`, `installments`, `paidPercent`), add it to `nexbaron-api` first (`src/models/*` → `src/features/*/services/*` → `src/features/*/controllers/*`) and consume the API response as-is. No `compute*()` fallbacks in `src/pages/*.tsx`.

Customer-facing portal where users manage their Nexbaron account (orders, progress, chat, settings). Vite SPA. Consumes `/{division}/*` customer-authenticated routes through the `nexbaron-api` gateway (`/Users/nishantkumar/dev/nexbaron-api`).

## Commands

```bash
npm run dev          # vite on port 5173
npm run build       # tsc -b && vite build
npm run lint        # oxlint
```

No tests, no `typecheck` script (`tsc -b` inside `build` is the type gate). Note: `tsconfig.app.json` is NOT strict (`strict`/`noUnusedLocals`/`noUnusedParameters` unset) — dead code compiles.

## Architecture

- **React 19 + TypeScript 7 + Vite 8 + react-router-dom v7** (BrowserRouter). Tailwind 4 (CSS-first via `@theme` in `src/index.css`, no `tailwind.config`). Icons: lucide-react.
- **Auth**: Bearer JWT from localStorage key `nexbaron-hub-token-{division}` (see `authTokenKey` in `src/lib/api.ts`). `AuthProvider` in `src/auth/auth-context.tsx` manages sign-in/sign-out via `lib/api.ts`; supports `?token=` auto-login from the web pricing-page signup.
- **API layer**: `apiRequest<T>()` from `src/lib/api.ts` — native fetch, Bearer token, division-scoped.
- **Realtime chat:** `src/lib/chat-socket.ts` + `VITE_CHAT_URL` → dedicated `nexbaron-chat` service.
- Division-aware routing: `/digital/*` and `/print/*` both served by same codebase.

### Routes

```
/:division/login          OTP (email) + Google
/:division                Projects — tracker overview (index route)
/:division/projects/:projectId   ProjectDetail — pipeline + orders + quotes + messages
/:division/orders         Order history + receipt download
/:division/progress       Order progress timeline/steps
/:division/plan           "My Plan" — plan builder + Razorpay checkout
/:division/chat           Chat (attachments, socket realtime)
/:division/settings       ORPHANED — no nav link; the sidebar opens an in-shell profile modal instead
```

### Env (`.env.local`)

`VITE_API_URL_DIGITAL`/`VITE_API_URL_PRINT` (fallback `VITE_API_URL`), `VITE_CHAT_URL` (chat service root, default `https://chat.nexbaron.com`), `VITE_GOOGLE_CLIENT_ID_DIGITAL`/`VITE_GOOGLE_CLIENT_ID_PRINT`. Only the API URLs are documented in `.env.example`.

### Theming

CSS-variable tokens (`--accent-color`, `--accent`, `--border`, `--bg`, `--heading`, `--muted`, `--surface`). Two palettes: digital (teal) / print (amber), both support light/dark via `data-theme` attribute. `DivisionProvider` in `src/theme/theme-provider.tsx` sets division colors; `ThemeProvider` manages light/dark toggle.

**Theme rules (MUST follow):**
- Never use hardcoded dark-mode-only colors: avoid `text-white`, `text-slate-*`, `bg-slate-900`, `bg-slate-950`, `border-white/*`.
- Always use theme tokens: `text-heading`, `text-muted`, `bg-neutral-bg`, `bg-neutral-surface`, `border-border`.
- Buttons/badges on `bg-accent` MUST use `text-accent-fg` (theme-aware: dark in dark themes, white in light themes). Never use `text-white` on `bg-accent` — in dark themes the accent is light teal/amber, so white text is low-contrast.
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
- Primary: `bg-accent text-accent-fg rounded-xl font-bold hover:opacity-90`.
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

**CRITICAL — Tailwind v4 preflight kills `cursor: pointer` on ALL elements.** Native browser cursors do NOT work. Every interactive element MUST have `cursor-pointer`:

- `<button>` — **REQUIRES `cursor-pointer`** in className. Tailwind v4 preflight removes the native `cursor: pointer`.
- `<a href="...">` — natively gets `cursor: pointer`, but add `cursor-pointer` for safety.
- `<div onClick={...}>`, `<span onClick={...}>`, `<tr onClick={...}>` — must include `cursor-pointer`.
- `<select>`, `<input type="checkbox">`, `<input type="radio">` — must include `cursor-pointer`.
- Any element with `onClick` — must include `cursor-pointer`.
- `hover:` transitions on clickable rows: `hover:bg-neutral-bg cursor-pointer transition-colors`.

**Global CSS fix (do NOT remove):**
```css
@import "tailwindcss";
button, [role="button"], select, input[type="checkbox"], input[type="radio"] {
  cursor: pointer;
}
```
This lives in `src/index.css` right after the tailwind import. Never delete it.

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
