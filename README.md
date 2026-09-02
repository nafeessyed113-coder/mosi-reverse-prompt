[README.md](https://github.com/user-attachments/files/31723221/README.md)
# Reverse Prompt

Upload a video → MOSS-VL analyzes it → get a generation prompt → (optional) refine it for a style → generate a new video with the video model of your choice.

## What's working right now

- Full UI: upload, key entry, three-stage flow
- `/api/analyze` — real call to MOSS-VL's `/v1/responses` endpoint, including the required `purpose: "vision"` field on upload (confirmed via a live 400 error)
- `/api/refine` — real call to Claude, optional style rewrite step (needs `ANTHROPIC_API_KEY` set in Vercel)
- `/api/generate` — provider-agnostic router, currently supports two real, working video models:
  - **MiniMax-H3** (`api/providers/minimax.js`)
  - **Seedance 2.5 via Flaq AI** (`api/providers/seedance-flaq.js`) — ByteDance's own official Seedance API has been paused since March 2026 over a copyright dispute, so this is a third-party REST wrapper, not ByteDance directly

## Adding another video model later

Drop a new file in `api/providers/` that exports:
```js
export const id = 'your-model-id';
export const label = 'Display Name';
export async function generate({ apiKey, prompt, resolution, duration, ratio }) {
  // return { taskId, status, videoUrl } or { pending: true } if still running
}
```
Then register it in `api/generate.js`'s `PROVIDERS` object and add an `<option>` in `public/index.html`'s provider dropdown. Nothing else needs to change.

## What's still unverified

- **MOSS-VL upload endpoint shape**: `purpose` is confirmed required, but the exact response field (`id` vs `file_id`) is still unconfirmed against the official spec.
- **MiniMax Query Task endpoint**: inferred from a reference to it in MiniMax's regeneration doc, not its own dedicated doc page.
- **Flaq AI's Seedance route**: docs are consistent across several of their model pages, but this hasn't been tested against a live account yet.

## To deploy

1. Push this folder to a GitHub repo.
2. Go to vercel.com, sign in with GitHub (free), import the repo.
3. In the Vercel project's Environment Variables (under General), add `ANTHROPIC_API_KEY` = your own Claude API key, only needed for the optional refine step.
4. Deploy. Vercel gives you a live URL automatically.

## Before filming

1. Run the full flow once end to end with a real video and both provider options to confirm nothing breaks mid-recording.
