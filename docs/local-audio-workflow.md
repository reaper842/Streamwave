# Local Audio Workflow

How to use local MP3 files for development instead of Cloudflare R2 or external URLs.

---

## How it works

When `R2_ACCOUNT_ID` is not set, `server/services/tracks.ts` returns the `audio_url` column value directly as the stream URL. Next.js serves everything inside `public/` as static files at the root path, so `/audio/song.mp3` resolves to `http://localhost:3000/audio/song.mp3` — which Howler.js fetches directly in the browser.

---

## Steps

### 1. Add your MP3 files

Create the folder and place your files inside:

```
streamwave/public/audio/
  song1.mp3
  song2.mp3
  song3.mp3
  ...
```

### 2. Update the seed script

Open `prisma/seed.ts` and change the `audio_url` line (~line 135) to reference your files:

```ts
// Before (external placeholder URLs)
audio_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(k % 16) + 1}.mp3`,

// After (local files from public/audio/)
audio_url: `/audio/song${(k % 16) + 1}.mp3`,
```

Adjust the filename pattern to match whatever files you placed in `public/audio/`.

### 3. Re-seed the database

```bash
npx prisma db seed
```

This wipes all existing tracks, albums, artists, and playlists and recreates them with the new URLs.

---

## Notes

- File names must match exactly (case-sensitive on Linux/Mac).
- Any audio format Howler.js supports works: `.mp3`, `.ogg`, `.wav`, `.flac`.
- The `public/audio/` folder is not committed to Git by default — add your own `.gitignore` entry if needed:
  ```
  public/audio/
  ```
- For production, replace local paths with Cloudflare R2 keys and set the `R2_*` environment variables. See `.env.example` for the full list.
