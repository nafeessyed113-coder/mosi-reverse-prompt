// api/generate.js
// Provider-agnostic router. Add a new video model by dropping a file in
// api/providers/ that exports { id, label, generate({ apiKey, prompt, ... }) }
// and registering it below — nothing else in this file changes.

import * as minimax from './providers/minimax.js';
import * as seedanceFlaq from './providers/seedance-flaq.js';

const PROVIDERS = {
  [minimax.id]: minimax,
  [seedanceFlaq.id]: seedanceFlaq,
};

export const availableProviders = Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label }));

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // lets the frontend fetch the live provider list instead of hardcoding it
    return res.status(200).json({ providers: availableProviders });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { provider, apiKey, prompt, resolution, duration, ratio } = req.body || {};

  if (!provider) return res.status(400).json({ error: 'Missing provider.' });
  if (!apiKey) return res.status(400).json({ error: 'Missing API key.' });
  if (!prompt) return res.status(400).json({ error: 'Missing prompt.' });

  const adapter = PROVIDERS[provider];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown provider "${provider}". Available: ${Object.keys(PROVIDERS).join(', ')}` });
  }

  try {
    const result = await adapter.generate({ apiKey, prompt, resolution, duration, ratio });
    return res.status(result.pending ? 202 : 200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
