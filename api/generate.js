// api/generate.js
// Real implementation, built from MiniMax's own documented API
// (platform.minimax.io/docs/api-reference/video-generation-v2-create and
// video-generation-v2-regeneration, which confirms the query endpoint path).
//
// Flow:
//   1. POST /v2/video_generation -> returns { task: { id, status, ... } }
//   2. Poll GET /v2/query/video_generation?task_id=... until status is
//      "succeeded" or "failed"
//   3. On success, task.content.url is the finished video
//
// NOTE: the query endpoint's exact method/params are inferred from a
// reference to it in MiniMax's regeneration doc, not from its own
// dedicated doc page. If polling fails, that's the first thing to check
// against the real Query Task page.

const MINIMAX_BASE_URL = 'https://api.minimax.io';
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { apiKey, prompt, resolution, duration, ratio } = req.body || {};

  if (!apiKey) return res.status(400).json({ error: 'Missing MiniMax API key.' });
  if (!prompt) return res.status(400).json({ error: 'Missing prompt.' });

  try {
    // --- Step 1: create the video generation task ---
    const createRes = await fetch(`${MINIMAX_BASE_URL}/v2/video_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-H3',
        content: [{ type: 'text', text: prompt }],
        resolution: resolution || '2K',
        duration: duration || 5,
        ratio: ratio || '16:9',
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return res.status(createRes.status).json({ error: `Task creation failed (${createRes.status}): ${errText.slice(0, 300)}` });
    }

    const createData = await createRes.json();
    const taskId = createData.task?.id;

    if (!taskId) {
      return res.status(502).json({ error: 'Task created but no task id came back. Check the create response shape.' });
    }

    // --- Step 2: poll until succeeded or failed ---
    let finalTask = createData.task;

    for (let i = 0; i < MAX_POLLS; i++) {
      if (finalTask.status === 'succeeded' || finalTask.status === 'failed') break;

      await sleep(POLL_INTERVAL_MS);

      const queryRes = await fetch(`${MINIMAX_BASE_URL}/v2/query/video_generation?task_id=${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!queryRes.ok) {
        const errText = await queryRes.text();
        return res.status(queryRes.status).json({ error: `Query failed (${queryRes.status}): ${errText.slice(0, 300)}` });
      }

      const queryData = await queryRes.json();
      finalTask = queryData.task || finalTask;
    }

    if (finalTask.status !== 'succeeded') {
      return res.status(202).json({
        error: `Task ${taskId} did not finish within the wait window (last status: ${finalTask.status}). It may still complete, check back with this task_id.`,
        taskId,
        status: finalTask.status,
      });
    }

    return res.status(200).json({
      taskId,
      status: finalTask.status,
      videoUrl: finalTask.content?.url,
      duration: finalTask.duration,
      resolution: finalTask.resolution,
      usage: finalTask.usage,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
