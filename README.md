# Nexbaron Hub

Customer-facing portal where users manage their Nexbaron account — projects,
orders, progress, plan, and live chat. A Vite SPA consumed by both divisions
(Digital + Print) via division-scoped routes on the `nexbaron-api` gateway.

## Stack
- **Client:** React 19 + Vite 8 + TypeScript + Tailwind 4 + React Router 7 (SPA)
- **API (shared):** nexbaron-api — Express 5 + Mongoose 9 (`/{division}/*` customer routes)
- **Realtime chat:** nexbaron-chat service (Socket.io, separate host)
- **Auth:** Bearer JWT in `localStorage` (`nexbaron-hub-token-{division}`); OTP (email) + Google sign-in
- **Payments:** Razorpay checkout on the "My Plan" page

## Development
```bash
npm install
npm run dev        # Vite on :5173; expects nexbaron-api locally (:3001/:3002)
npm run build      # tsc -b + production build
npm run lint       # oxlint
```

## Environment (`.env.local`)
| Var | Purpose |
|-----|---------|
| `VITE_API_URL` | Shared API root fallback; defaults to `http://localhost:3001` |
| `VITE_API_URL_DIGITAL` | Digital API root; overrides the shared fallback for Digital |
| `VITE_API_URL_PRINT` | Print API root; overrides the shared fallback for Print |
| `VITE_CHAT_URL` | Dedicated chat service root (no trailing slash); default `https://chat.nexbaron.com` |
| `VITE_GOOGLE_CLIENT_ID_DIGITAL` / `_PRINT` | Google client IDs; Google button hidden when unset |

## Deployment
`npm run build` produces a static `dist/`, hosted on Vercel (`vercel.json` SPA rewrite).
