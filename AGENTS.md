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
