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
- **Custom context menus** — never browser native. Background `#282828`, hover `#3E3E3E`, 14px text, 36px row height. `ContextMenuTrigger` pre-clamps opening position to `Math.max(8, rect.right - 192)` in the click handler; `useLayoutEffect` fine-tunes with actual measured width via DOM mutation (not setState — blocked by `react-hooks/set-state-in-effect` ESLint rule).
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

**Critical Howler.js html5 gotchas (Sessions 45–46):**

- **Never call `playAtIndex` / `howl.unload()` synchronously from within `onend`** — Howler.js is still running its `_ended` cleanup when your callback fires. Calling `unload()` on the active Howl from inside its own callback corrupts Howler internal state and silently blocks the replacement Howl. Always use `queueMicrotask(() => this.playAtIndex(index))` to defer out of the callback.
- **`seek(0) + play()` on an ended html5 Howl does not restart playback** — the `<audio>` element stays in "ended" state. Use `playAtIndex(currentIndex)` to create a fresh Howl instead.

---

## Auth (Frontend Side)

- `useSession()` from `next-auth/react` provides user info (requires `SessionProvider` in root layout)
- `useAuthStore` manages action-level loading/error state only — does NOT hold session user
- `signIn('credentials', { redirect: false })` for email/password login
- `signIn(provider, { callbackUrl })` for OAuth
- `signOut({ redirectTo: '/login' })` for logout (v5 API, NOT `callbackUrl`)
- React 19 deprecated `React.FormEvent` — use `(e: { preventDefault(): void })` for `onSubmit`

---

## Content Components (M4) — `src/components/content/`

- `AlbumCard` / `ArtistCard` / `PlaylistCard` — card components with hover play button + right-click ContextMenu
- `TrackRow` + `TrackListHeader` — track row with album art, links, duration, three-dot context menu
- `TrackList` — header + list of TrackRows; accepts optional `emptyMessage?: string` to show an empty state instead of a bare header
- `CardGrid` — responsive 2–6 column CSS grid
- `PlayButton` — `PlayAlbumButton` / `PlayPlaylistButton` — client components for RSC pages

### TrackRow / TrackList — Queue Context Pattern (Session 55)

**ALWAYS pass `allTrackIds` from `TrackList` to `TrackRow`.** This ensures clicking any row loads the full album/playlist/top-tracks list into the queue, not a single-song queue.

`TrackList` computes `allTrackIds = tracks.map((t) => t.id)` and forwards it to each `TrackRow`. `TrackRow.handlePlay` then calls `playFromTrackIds(allTrackIds, index)` when `allTrackIds.length > 1`, or falls back to `playTrack(track.id)` for a single-song context.

Why this matters: `playTrack(trackId)` creates a **1-song queue** (`engine.play([track], 0)`). With repeat-all and 1 song, `getNextIndex()` wraps to index 0 — the same track, forever. This looked identical to repeat-one and was the root cause of the "repeat-all doesn't work" bug across Sessions 45–54. With `playFromTrackIds`, the full context (e.g. all 10 album tracks) is in the queue and repeat-all correctly cycles through all of them.

## Library Components (M5) — `src/components/library/`

- `PlayLikedSongsButton` — play + shuffle buttons for Liked Songs page; calls `usePlayerStore.playFromTrackIds`
- `AddToPlaylistModal` — modal listing user playlists to add a track; "New playlist" creates + adds in one action
- `EditPlaylistModal` — modal form to edit playlist name/description; calls `useLibraryStore.updatePlaylist`
- `DeletePlaylistDialog` — confirmation modal; calls `useLibraryStore.deletePlaylist` then navigates to `/library`
- `PlaylistControls` — client component composing play button + owner-only "…" dropdown (Edit/Delete); embedded in playlist RSC page

## Content Buttons (M5) — `src/components/content/`

- `FollowArtistButton` — client toggle button wired to `useLibraryStore.toggleFollowArtist`; shows "Follow"/"Following"
- `SaveAlbumButton` — client toggle button wired to `useLibraryStore.toggleSaveAlbum`; shows "Save"/"Saved"

### Drag-and-Drop Track Reorder (Session 58) — `@dnd-kit`

`DraggableTrackList` + `SortableTrackRow` implement playlist owner drag-to-reorder. **`TrackRow` is unchanged.**

**Architecture (critical — the dragHandle-as-prop approach does NOT work):**

```
<div ref={setNodeRef} className="group flex items-stretch">   ← SortableTrackRow root
  <button ref={setActivatorNodeRef} {...listeners} {...attributes}  ← grip handle, direct group child
    className="w-5 opacity-0 group-hover:opacity-100 ...">
    <GripVertical />
  </button>
  <div className="min-w-0 flex-1">
    <TrackRow ... />                                           ← unchanged component
  </div>
</div>
```

Key rules:

- **`setActivatorNodeRef` is required** on the grip button — without it, dnd-kit watches the root `setNodeRef` div and the grip button's `{...listeners}` events never fire
- **Grip button must be a direct child of the `group` div** (not inside TrackRow) so `group-hover:opacity-100` resolves to the correct ancestor
- `DraggableTrackList` header uses `<div className="w-5 flex-shrink-0" aria-hidden="true" />` spacer to align header columns with row columns
- `PointerSensor` with `activationConstraint: { distance: 5 }` prevents accidental drags on row clicks
- Optimistic reorder: `arrayMove` updates local `useState` immediately; `useLibraryStore.reorderPlaylistTracks` persists to API
- `playlist/[id]/page.tsx` renders `DraggableTrackList` when `isOwner`, `TrackList` otherwise

## Server-side Data Layer (RSC only)

- `src/lib/data/content.ts` — Prisma-based data fetchers for RSC pages (no HTTP loopback)
  - `fetchAlbum`, `fetchArtist`, `fetchArtistAlbums`, `fetchArtistTopTracks`, `fetchPlaylist`, `fetchFeatured`, `getStaticGenres`
- `src/lib/data/library.ts` — RSC fetcher `fetchLikedSongs(userId)` using Prisma directly
- `src/lib/data/profile.ts` — RSC fetcher `fetchUserProfileStats(userId)` — user row + 4 library counts in parallel
- Import ONLY from Server Components / server actions. Never from `"use client"` components.
- Liked Songs page calls `auth()` from `src/lib/auth/config.ts` to get `session.user.id`

## Profile & Settings Pages (Sessions 32, 34)

- `src/app/(main)/profile/page.tsx` — RSC. Calls `auth()` + `fetchUserProfileStats()`. Gradient hero (indigo/violet layered gradients), large circular avatar, display name + inline stats in hero. Action bar with "Edit Profile" → `/settings`. Stats grid (4 cards with icons + hover chevron). Quick Access links section. Has `loading.tsx` skeleton.
- `src/app/(main)/settings/page.tsx` — Client Component. Profile summary card at top (avatar + name + "View Profile" link). Account section: email (read-only) + display name (editable, save inline). Privacy & Security: Change Password link → `/reset-password`. Account Actions: Log out with `signOut({ redirectTo: '/login' })`. Has `loading.tsx` skeleton.
- **TopBar navigation**: Profile and Settings dropdown items use `<Link href>` (NOT `router.push`). `router.push` silently fails when Turbopack bundle is stale; `<Link>` generates a real `<a>` tag that works at the framework level regardless of bundle state.

## Library Store (M5) — `src/stores/library.ts`

- `useLibraryStore` — state: `likedSongIds`/`savedAlbumIds`/`followedArtistIds` (Sets) + `playlists` array
- `fetchLibrary()` — bootstraps all 4 endpoints in parallel; called in `(main)/layout.tsx` on mount
- Toggle actions (`toggleLike`, `toggleSaveAlbum`, `toggleFollowArtist`) — optimistic updates with snapshot-before + revert-on-error
- Store does NOT call toast directly — expose `error` state; components react to it
- `usePlayerStore.playFromTrackIds(trackIds[], startIndex?)` — plays arbitrary track ID lists (used by liked songs)

## Search (M6) — `src/stores/search.ts`, `src/components/search/`

- `useSearchStore` — state: `query`, `results`, `searchHistory`, `isLoading`; actions: `search`, `clearResults`, `addToHistory/clearHistory/loadHistory`, `setQuery`
- `SearchInput` — shown in TopBar only on `/search` routes (via `usePathname`); wires to `useDebounce(300ms)` → `useSearchStore.search`
- `useDebounce<T>` at `src/hooks/useDebounce.ts`
- `TopResult` — hero card for best match; play button for non-artist results
- Search page — no-query: history + genre browse; has-query: TopResult + Songs + horizontal scroll rows (Artists, Albums, Playlists) + empty state
- Genre page at `(main)/search/genre/[genre]/page.tsx` — RSC, hero banner + artist/album grids
- `src/lib/utils/genres.ts` — `getStaticGenres()` (client-safe; `src/lib/data/content.ts` re-exports it for RSC)
- Search types in `src/types/search.ts` — never import server search services from client code

## Polish & Responsive (M7)

### Loading States

- `src/app/(main)/loading.tsx` — Home skeleton: greeting + 2 card grid sections + genre tiles
- `src/app/(main)/album/[id]/loading.tsx` — Album skeleton: 232×232 hero + track rows
- `src/app/(main)/artist/[id]/loading.tsx` — Artist skeleton: hero banner + track rows + album cards
- `src/app/(main)/playlist/[id]/loading.tsx` — Playlist skeleton: 232×232 hero + track rows
- All use Next.js `loading.tsx` convention (automatic Suspense — no manual wrapping needed)

### Error / Empty States

- `src/app/(main)/error.tsx` — Client error boundary for (main) routes; "Try again" calls Next.js `reset()`
- `src/app/not-found.tsx` — Global 404 page with back-to-home link
- `TrackList` `emptyMessage` prop — pass when an empty list is semantically meaningful (playlist pages); omit for albums (empty album tracks = data error)

### Mobile Layout (< 640px / `sm` breakpoint)

- `src/components/playback/MiniPlayer.tsx` — Album art + title + play/pause; returns null when no track. Fixed at `bottom-14` (above tab nav)
- `src/components/layout/MobileNavBar.tsx` — Home/Search/Library tabs; fixed `bottom-0`; hidden on `sm:hidden`
- `src/components/layout/PlaybackBar.tsx` — Full bar `hidden sm:block` at `bottom-0`; mini player `sm:hidden` at `bottom-14`
- Content padding: `pb-[112px] sm:pb-[90px]` — 56px mini + 56px tab nav on mobile, 90px bar on desktop

## Key Frontend Files

- `src/app/globals.css` — Tailwind 4 theme + design tokens
- `src/app/layout.tsx` — Root layout (SessionProvider, ToastProvider, PlaybackBar, MobileNavBar)
- `src/app/(main)/layout.tsx` — Authenticated layout (Sidebar + TopBar + MainContent); bootstraps `fetchLibrary()`
- `src/stores/player.ts` — Playback state and queue
- `src/stores/auth.ts` — Login/register/logout actions + error state
- `src/stores/library.ts` — Library state (liked/saved/followed + playlists), optimistic CRUD
- `src/lib/audio/engine.ts` — Howler.js singleton
- `src/lib/api/client.ts` — Typed fetch wrapper with auth header injection. **`Content-Type: application/json` is only set when `body !== undefined`** — never send it with an empty body or Fastify returns 400.
- `src/types/content.ts` — Shared content types (TrackSummary, AlbumDetail, PlaylistDetail, etc.)
- `src/proxy.ts` — Next.js 16 route guard (replaces middleware.ts); also enforces HTTP→HTTPS redirect in production via `x-forwarded-proto` check

## Dynamic Imports (M8)

Modal components that are only rendered on user action are lazy-loaded via `next/dynamic({ ssr: false })` to exclude them from the initial JS bundle. The pattern for named exports:

```typescript
const MyModal = dynamic(() => import('@/components/...').then((m) => ({ default: m.MyModal })), {
  ssr: false,
})
```

Applied to: `AddToPlaylistModal` (TrackRow), `EditPlaylistModal` + `DeletePlaylistDialog` (PlaylistControls).

## Test Selectors (data-testid)

- `[data-testid="playback-bar"]` — `<footer>` in `PlaybackBar.tsx` (full 90px bar)
- `[data-testid="now-playing-title"]` — `<p>` in `NowPlaying.tsx` (current track title)

## Account Tab Bar

`AccountTabBar` at `src/components/layout/AccountTabBar.tsx` — client component shared by `/profile` and `/settings` pages. Uses `usePathname()` to highlight the active tab. Pill-style tabs matching Library page style. Must remain a `'use client'` component; can be safely rendered from Profile RSC because server components can render client components in App Router.

## Notification Preferences (Session 39)

- `src/types/notifications.ts` — `NotificationPreferences` interface (4 boolean flags) + `NotificationPreferenceKey` type alias
- `src/app/(main)/settings/notifications/page.tsx` — client component. Fetches via `apiClient.get<NotificationPreferences>('/users/me/notifications')`. Renders 4 toggle rows with `<button role="switch" aria-checked>` toggle. Optimistic updates: flip → PATCH → revert on error.
- `src/app/(main)/settings/notifications/loading.tsx` — skeleton matching page layout
- `src/app/(main)/settings/page.tsx` — Notifications row is `<Link href="/settings/notifications">` (no longer a `opacity-50 cursor-default` placeholder). The Privacy & Security container has `suppressHydrationWarning` to tolerate Turbopack cache drift.
- **`apiClient.get<T>` generic** — pass the inner type directly (`T = NotificationPreferences`); `res.data` is already `T`. Do NOT wrap as `{ data: T }`.
- **Toggle pattern** — `<button role="switch" aria-checked={checked}>` is the ARIA-correct approach for custom toggle switches (not `<input type="checkbox">`). The `id` prop wires to `<label htmlFor>` for accessible click area.
