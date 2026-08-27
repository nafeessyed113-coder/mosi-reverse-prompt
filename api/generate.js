// api/generate.js
// NOT WIRED UP YET.
// This is where the finished prompt gets sent to Seedance 2.5 to produce
// the new video. It needs the real API reference: base URL, auth header
// format, request body shape, and how the result (a video file or a job
// you poll) comes back. Once that's available, replace the body of this
// handler with the real fetch call, following the same pattern as
// api/analyze.js — read the docs, don't guess parameters, return the
// actual result.

export default async function handler(req, res) {
  return res.status(501).json({
    error:
      'Seedance 2.5 is not connected yet. This endpoint is a placeholder until the real API reference (endpoint, auth, request/response shape) is available.',
  });
}
