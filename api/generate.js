// api/generate.js
// NOT WIRED UP YET.
// This is where the finished prompt gets sent to MiniMax-H3 to produce
// the new video. MiniMax's own docs confirm this is a TASK-BASED flow,
// not a single call like MOSS-VL:
//   1. POST to Create Video Generation Task -> returns a task_id
//   2. Poll Query Task with that task_id until status is done
//   3. The completed task response includes the file_id / download URL
// The overview page names these endpoints but not their exact request
// body shape. Once that's available, replace the body of this handler
// with the real two-step flow — same rule as api/analyze.js: read the
// docs, don't guess parameters, return the actual result.

export default async function handler(req, res) {
  return res.status(501).json({
    error:
      'MiniMax-H3 is not connected yet. This endpoint is a placeholder until the exact Create Video Generation Task request body (and Query Task response shape) is available.',
  });
}
