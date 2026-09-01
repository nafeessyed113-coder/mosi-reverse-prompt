// api/refine.js
// Optional step. Takes the raw MOSS-VL prompt + a style description and
// asks Claude to rewrite it in that style. Uses YOUR OWN Anthropic API key
// (set as an environment variable in Vercel), not a key the visitor enters —
// the brief only asked visitors for a MOSI.AI key, so this cost sits with you.
// If you'd rather use OpenAI/GPT for this step instead, swap the fetch call
// below for the OpenAI chat completions endpoint; the surrounding logic
// stays the same.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { prompt, style } = req.body || {};
  if (!prompt || !style) {
    return res.status(400).json({ error: 'Missing prompt or style.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({
      error: 'Refine step needs an ANTHROPIC_API_KEY set in your Vercel project environment variables.',
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content:
              `Rewrite this AI video generation prompt to match the requested style, keeping every concrete visual detail that's already in it (subject, setting, actions). Only change tone, lighting, and camera description to fit the style. Return only the rewritten prompt, nothing else.\n\nOriginal prompt:\n${prompt}\n\nStyle to apply:\n${style}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Refine call failed: ${errText.slice(0, 300)}` });
    }

    const data = await response.json();
    const refinedPrompt = data.content?.find((b) => b.type === 'text')?.text?.trim() || prompt;

    return res.status(200).json({ refinedPrompt });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
