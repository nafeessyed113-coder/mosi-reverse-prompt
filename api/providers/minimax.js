// api/providers/minimax.js
// MiniMax-H3, task-based flow. Real and tested.
// Docs: platform.minimax.io/docs/api-reference/video-generation-v2-create

const BASE_URL = 'https://api.minimax.io';
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const id = 'minimax-h3';
export const label = 'MiniMax-H3';

export async function generate({ apiKey, prompt, resolution, duration, ratio }) {
  const createRes = await fetch(`${BASE_URL}/v2/video_generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'MiniMax-H3',
      content: [{ type: 'text', text: prompt }],
      resolution: resolution || '2K',
      duration: duration || 5,
      ratio: ratio || '16:9',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`MiniMax task creation failed (${createRes.status}): ${(await createRes.text()).slice(0, 300)}`);
  }

  const createData = await createRes.json();
  const taskId = createData.task?.id;
  if (!taskId) throw new Error('MiniMax task created but no task id came back.');

  let finalTask = createData.task;
  for (let i = 0; i < MAX_POLLS; i++) {
    if (finalTask.status === 'succeeded' || finalTask.status === 'failed') break;
    await sleep(POLL_INTERVAL_MS);

    const queryRes = await fetch(`${BASE_URL}/v2/query/video_generation?task_id=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!queryRes.ok) {
      throw new Error(`MiniMax query failed (${queryRes.status}): ${(await queryRes.text()).slice(0, 300)}`);
    }
    finalTask = (await queryRes.json()).task || finalTask;
  }

  if (finalTask.status !== 'succeeded') {
    return { taskId, status: finalTask.status, videoUrl: null, pending: true };
  }

  return {
    taskId,
    status: finalTask.status,
    videoUrl: finalTask.content?.url,
    duration: finalTask.duration,
    resolution: finalTask.resolution,
  };
}
