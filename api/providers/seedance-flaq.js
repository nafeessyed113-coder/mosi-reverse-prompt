// api/providers/seedance-flaq.js
// Seedance 2.5, via Flaq AI (a third-party REST wrapper, not ByteDance's
// own API directly — ByteDance's own official API has been paused since
// March 2026 per a copyright dispute, so this is the working path).
// Docs consistent across multiple flaq.ai model pages (seedance-v2.5-text-to-video).

const BASE_URL = 'https://api.flaq.ai/api/v1';
const POLL_INTERVAL_MS = 10000; // flaq's own docs poll every 10s
const MAX_POLLS = 30; // ~5 minutes

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const id = 'seedance-2.5-flaq';
export const label = 'Seedance 2.5 (via Flaq AI)';

export async function generate({ apiKey, prompt, resolution, duration, ratio, sound }) {
  const createRes = await fetch(`${BASE_URL}/video/task`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_name: 'seedance-v2.5-text-to-video',
      prompt,
      resolution: resolution || '720p',
      duration: duration || 8,
      aspect_ratio: ratio || '16:9',
      sound: sound !== undefined ? sound : true,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Flaq task creation failed (${createRes.status}): ${(await createRes.text()).slice(0, 300)}`);
  }

  const createData = await createRes.json();
  const taskId = createData.data?.task_id;
  if (!taskId) throw new Error('Flaq task created but no task_id came back.');

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(`${BASE_URL}/video/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) {
      throw new Error(`Flaq poll failed (${pollRes.status}): ${(await pollRes.text()).slice(0, 300)}`);
    }
    const pollData = (await pollRes.json()).data;

    if (pollData.task_status === 'succeed') {
      return {
        taskId,
        status: 'succeeded',
        videoUrl: pollData.task_result?.videos?.[0]?.url,
      };
    }
    if (pollData.task_status === 'failed') {
      throw new Error(`Flaq generation failed: ${pollData.task_status_msg || 'no reason given'}`);
    }
  }

  return { taskId, status: 'pending', videoUrl: null, pending: true };
}
