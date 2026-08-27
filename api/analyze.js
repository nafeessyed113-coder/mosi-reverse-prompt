// api/analyze.js
// Vercel serverless function.
// Takes a user-supplied MOSI.AI API key + a video file, uploads it, calls
// /v1/responses, and returns a text prompt an end user could paste into
// a video generation tool.
//
// ASSUMPTION FLAGGED: the exact Upload File endpoint (path, field name,
// response shape) was referenced in the MOSS docs as a link but its full
// spec wasn't captured from the screenshot. This function calls
// POST {MOSS_BASE_URL}/v1/files with the video as multipart form data and
// expects { id: "<file_id>" } back, which matches the general shape used
// elsewhere in the docs (file_id, id fields). If the real endpoint differs,
// this is the one function that needs updating — everything else (the
// /v1/responses call, the UI, the response parsing) is built from the
// documented and already-verified schema.

export const config = {
  api: {
    bodyParser: false, // we're handling multipart ourselves
  },
};

import formidable from 'formidable';
import fs from 'fs';

const MOSS_BASE_URL = 'https://api.mosi.cn';

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 200 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { fields, files } = await parseForm(req);
    const apiKey = Array.isArray(fields.apiKey) ? fields.apiKey[0] : fields.apiKey;
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;

    if (!apiKey) return res.status(400).json({ error: 'Missing MOSI.AI API key.' });
    if (!videoFile) return res.status(400).json({ error: 'Missing video file.' });

    // --- Step 1: upload the video to get a file_id ---
    // NOTE: this is the flagged assumption — see comment at top of file.
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob([fs.readFileSync(videoFile.filepath)]), videoFile.originalFilename || 'video.mp4');

    const uploadRes = await fetch(`${MOSS_BASE_URL}/v1/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return res.status(uploadRes.status).json({
        error: `Upload failed (${uploadRes.status}). This is the unverified Upload File endpoint — check the real spec if this keeps failing. Raw response: ${errText.slice(0, 300)}`,
      });
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.id || uploadData.file_id;

    if (!fileId) {
      return res.status(502).json({ error: 'Upload succeeded but no file_id came back. Check the Upload File response shape.' });
    }

    // --- Step 2: call /v1/responses, documented and verified ---
    const instruction =
      'Describe this video in enough visual detail to write a generation prompt for an AI video model: ' +
      'subject, setting, lighting, camera framing and movement, color palette, mood, and any on-screen text or ' +
      'notable objects. Then, on a new line starting with "PROMPT:", write a single-paragraph generation prompt ' +
      'that would recreate a similar video, based only on what is visually confirmed in the clip.';

    const analyzeRes = await fetch(`${MOSS_BASE_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moss-vl-1.0-2026-07-08',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: instruction },
              { type: 'input_video', file_id: fileId },
            ],
          },
        ],
        max_output_tokens: 1024,
      }),
    });

    if (!analyzeRes.ok) {
      const errText = await analyzeRes.text();
      return res.status(analyzeRes.status).json({ error: `Analysis call failed (${analyzeRes.status}): ${errText.slice(0, 300)}` });
    }

    const analyzeData = await analyzeRes.json();
    const outputText = analyzeData.output?.[0]?.content?.[0]?.text || '';

    // Pull out the PROMPT: line if the model followed the format; otherwise
    // fall back to the full response so nothing is silently dropped.
    const match = outputText.match(/PROMPT:\s*([\s\S]+)/i);
    const prompt = match ? match[1].trim() : outputText.trim();

    return res.status(200).json({
      prompt,
      fullAnalysis: outputText,
      fileId,
      responseId: analyzeData.id,
      usage: analyzeData.usage,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
