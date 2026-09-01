[README.md](https://github.com/user-attachments/files/31670601/README.md)
# Reverse Prompt

Upload a video → MOSS-VL analyzes it → get a generation prompt → (optional) refine it for a style → generate a new video with MiniMax-H3.

## What's working right now

- Full UI: upload, key entry, three-stage flow
- `/api/analyze` — real call to MOSS-VL's `/v1/responses` endpoint, including the required `purpose: "vision"` field on upload (confirmed via a live 400 error)
- `/api/refine` — real call to Claude, optional style rewrite step (needs `ANTHROPIC_API_KEY` set in Vercel)
- `/api/generate` — real call to MiniMax-H3: creates a video generation task, polls until done, returns the finished video URL

## What's still unverified

- **MOSS-VL upload endpoint shape**: `purpose` is confirmed required, but the exact response field (`id` vs `file_id`) is still unconfirmed against the official spec.
- **MiniMax Query Task endpoint**: `GET /v2/query/video_generation?task_id=...` is inferred from a reference to it in MiniMax's regeneration doc, not from its own dedicated doc page. If polling errors out, this is the first thing to check.

## To deploy

1. Push this folder to a GitHub repo.
2. Go to vercel.com, sign in with GitHub (free), import the repo.
3. In the Vercel project's Environment Variables (under General), add `ANTHROPIC_API_KEY` = your own Claude API key, only needed for the optional refine step.
4. Deploy. Vercel gives you a live URL automatically.

## Before filming

1. Run the full flow once end to end with a real video, a real MOSI.AI key, and a real MiniMax key to confirm nothing breaks mid-recording.
