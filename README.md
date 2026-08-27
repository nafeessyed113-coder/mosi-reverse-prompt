# Reverse Prompt

Upload a video → MOSS-VL analyzes it → get a generation prompt → (optional) refine it for a style → (planned) generate a new video with Seedance 2.5.

## What's working right now

- Full UI: upload, key entry, three-stage flow
- `/api/analyze` — real call to MOSS-VL's documented `/v1/responses` endpoint
- `/api/refine` — real call to Claude, optional style rewrite step

## What's NOT working yet

- **Video upload to MOSS-VL**: the docs referenced an "Upload File" endpoint as a link but didn't show its full spec (path, field name, response shape). `api/analyze.js` guesses `POST /v1/files` with a `file` field, returning `{ id }`. **This needs to be checked against the real spec or the working Python script from the earlier Claude Code test**, since that script already uploaded successfully once.
- **Seedance 2.5 generation**: completely stubbed in `api/generate.js`. Needs the real endpoint, auth format, and request/response shape before this can call anything.

## To deploy

1. Push this folder to a GitHub repo.
2. Go to vercel.com, sign in with GitHub (free), import the repo.
3. If you're using the refine step, add an environment variable in the Vercel project settings: `ANTHROPIC_API_KEY` = your own Claude API key. (This is your cost, not the visitor's — they only enter a MOSI.AI key.)
4. Deploy. Vercel gives you a live URL automatically.

## Before this is demo-ready

1. Fix the upload endpoint in `api/analyze.js` (see above).
2. Fill in `api/generate.js` once Seedance 2.5 docs are available.
3. Test the full flow end to end with a real video and a real MOSI.AI key.
