import { Router } from 'express';
import multer from 'multer';
import Groq from 'groq-sdk';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const MAX_BYTES = 25 * 1024 * 1024;

function maybeMulter(req, res, next) {
  if (req.is('multipart/form-data')) {
    upload.single('audio')(req, res, next);
  } else {
    next();
  }
}

// POST /api/transcribe — admin only
// Accepts multipart (field: audio) OR JSON body { url } for server-side fetch
router.post('/', adminAuth, maybeMulter, async (req, res, next) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: 'Transcription not configured (GROQ_API_KEY missing)' });
    }

    let audioBuffer, filename, mimeType;

    if (req.file) {
      audioBuffer = req.file.buffer;
      filename = req.file.originalname || 'audio.webm';
      mimeType = req.file.mimetype;
    } else if (req.body?.url) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      try {
        const response = await fetch(req.body.url, { signal: controller.signal });
        if (!response.ok) {
          return res.status(400).json({ error: `Failed to fetch video: HTTP ${response.status}` });
        }
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_BYTES) {
          return res.status(413).json({
            error: `Video is ${Math.round(contentLength / 1024 / 1024)} MB — too large for Whisper (25 MB limit). Upload a compressed audio file instead.`,
          });
        }
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > MAX_BYTES) {
          return res.status(413).json({
            error: `Video is ${Math.round(arrayBuf.byteLength / 1024 / 1024)} MB — too large for Whisper (25 MB limit). Upload a compressed audio file instead.`,
          });
        }
        audioBuffer = Buffer.from(arrayBuf);
        const urlPath = new URL(req.body.url).pathname;
        filename = urlPath.split('/').pop() || 'video.mp4';
        mimeType = response.headers.get('content-type') || 'video/mp4';
      } finally {
        clearTimeout(timeout);
      }
    } else {
      return res.status(400).json({ error: 'Provide an audio file (multipart) or a video URL in JSON body' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const audioFile = new File([audioBuffer], filename, { type: mimeType });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
    });

    const cues = (transcription.segments || [])
      .map((seg) => ({
        time: Math.round(seg.start),
        endTime: Math.round(seg.end),
        text: seg.text.trim(),
      }))
      .filter((c) => c.text);

    res.json({ cues });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: 'Audio too short or unsupported format' });
    if (err?.name === 'AbortError') return res.status(504).json({ error: 'Timed out fetching video URL' });
    next(err);
  }
});

export default router;
