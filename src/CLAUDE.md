# src/CLAUDE.md — Frontend Context

> This file contains frontend-specific conventions for the StreamWave Next.js application.
> For project-wide context, see the root `CLAUDE.md`.
> For backend/API context, see `server/CLAUDE.md`.

---

## Design Tokens — Mandatory

Every color comes from these tokens defined in `globals.css` via Tailwind 4 `@theme` block:

```
--bg-base:         #121212     (app background)
--bg-elevated:     #181818     (cards, sidebar, playback bar)
--bg-highlight:    #282828     (hover states, active items)
--bg-press:        #3E3E3E     (pressed/active buttons)
--text-primary:    #FFFFFF     (headings, active nav)
--text-secondary:  #B3B3B3     (body text, inactive nav)
--text-subdued:    #6A6A6A     (timestamps, disabled)
--accent-primary:  #1DB954     (primary CTA, progress bar fill, active indicators)
--accent-hover:    #1ED760     (hover on accent elements)
--border-default:  #282828     (dividers, borders)
--overlay:         rgba(0,0,0,0.7)  (modal backdrop)
```

**Font:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
**There is no light mode.** Do not add one. Do not add a theme toggle.

Tailwind 4 note: theme customization happens via `@theme { --color-* }` in `globals.css`. Classes like `bg-bg-base` and `text-text-primary` work automatically. There is NO `tailwind.config.ts`.

---

## Layout Rules — Non-Negotiable

The app has four fixed layout regions. Violating this structure breaks Spotify parity.

1. **Left Sidebar** — fixed left, 280px expanded / 72px collapsed. Contains: Home, Search, Library list. Background: `--bg-elevated`
2. **Top Bar** — sticky top, 64px tall. Back/forward buttons, user avatar + dropdown. On `/search`: search input. Background: transparent → `--bg-elevated` on scroll
3. **Main Content Area** — scrollable center. All route content renders here
4. **Playback Bar** — fixed bottom, 90px, full width. **Never unmounts.** Rendered in root layout outside the router. Three sections: Now Playing (30%), Transport Controls (40%), Volume/Queue (30%)

**Playback must persist across navigation.** AudioEngine singleton + `usePlayerStore` live above the router.

---

## Component Patterns

### File Organization

- One component per file, file name matches default export
- Props interface defined above the component
- Use `"use client"` only when hooks/interactivity needed — Server Components by default

### State Management

- **Zustand** for all app state — one store per domain
- **Never use `useEffect` + direct fetch** for server data — use API client helpers in `lib/api/`
- Components call store actions — never put business logic in components

### UI Patterns

- **Hover-to-reveal play buttons** on cards/track rows (opacity transition, 200ms)
- **Custom context menus** — never browser native. Background `#282828`, hover `#3E3E3E`, 14px text, 36px row height
- **Loading skeletons** — shimmer placeholders matching exact dimensions of replaced component
- **Toast notifications** — bottom-center, 3-second auto-dismiss, dark bg + white text
- **Optimistic UI** for like/unlike, add-to-playlist, queue operations. Rollback on failure

### Keyboard Shortcuts (Global, registered in `useKeyboardShortcuts` hook in root layout)

- `Space` → Play/Pause
- `←`/`→` → Seek ±5 seconds
- `↑`/`↓` → Volume ±5%
- `Shift+←`/`Shift+→` → Previous/Next track

---

## Responsive Breakpoints

| Name       | Width      | Sidebar                    | Playback Bar |
| ---------- | ---------- | -------------------------- | ------------ |
| Desktop LG | ≥ 1200px   | Expanded (280px)           | Full         |
| Desktop SM | 900–1199px | Collapsed icon-only (72px) | Full         |
| Tablet     | 600–899px  | Hidden (hamburger)         | Simplified   |
| Mobile     | < 600px    | Bottom tab nav             | Mini-player  |

Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`.

---

## Audio Playback — `lib/audio/engine.ts`

Singleton class wrapping Howler.js. Must support:

- play, pause, resume, togglePlayPause, seek, setVolume, toggleMute
- next, previous, queue management (add, remove, reorder, clear)
- Shuffle (randomized order of remaining items) + Repeat (off/all/one)
- Pre-buffer next track 10s before current ends
- Media Session API integration for OS-level controls

**State flows through `usePlayerStore`.** Components NEVER interact with Howler directly.

---

## Auth (Frontend Side)

- `useSession()` from `next-auth/react` provides user info (requires `SessionProvider` in root layout)
- `useAuthStore` manages action-level loading/error state only — does NOT hold session user
- `signIn('credentials', { redirect: false })` for email/password login
- `signIn(provider, { callbackUrl })` for OAuth
- `signOut({ redirectTo: '/login' })` for logout (v5 API, NOT `callbackUrl`)
- React 19 deprecated `React.FormEvent` — use `(e: { preventDefault(): void })` for `onSubmit`

---

## Key Frontend Files

- `src/app/globals.css` — Tailwind 4 theme + design tokens
- `src/app/layout.tsx` — Root layout (SessionProvider, ToastProvider, PlaybackBar)
- `src/app/(main)/layout.tsx` — Authenticated layout (Sidebar + TopBar + MainContent)
- `src/stores/player.ts` — Playback state and queue
- `src/stores/auth.ts` — Login/register/logout actions + error state
- `src/lib/audio/engine.ts` — Howler.js singleton
- `src/lib/api/client.ts` — Typed fetch wrapper with auth header injection
- `src/proxy.ts` — Next.js 16 route guard (replaces middleware.ts)
