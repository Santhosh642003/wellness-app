import { Router } from 'express';
import multer from 'multer';
import Groq from 'groq-sdk';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /api/transcribe
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Groq requires a File-like object with a name property
    const audioFile = new File([req.file.buffer], 'audio.webm', { type: req.file.mimetype });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
    });

    res.json({ text: transcription.text });
  } catch (err) {
    if (err?.status === 400) return res.status(400).json({ error: 'Audio too short or unsupported format' });
    next(err);
  }
});

export default router;
