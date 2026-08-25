import { Router } from 'express';
import multer from 'multer';
import Groq from 'groq-sdk';
import { adminAuth } from '../middleware/adminAuth.js';
import { mkdtemp, rm, stat, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const MAX_BYTES = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — large video CDN downloads can be slow
const FFMPEG_TIMEOUT_MS   =  5 * 60 * 1000; // 5 min  — extraction is fast but be generous

function maybeMulter(req, res, next) {
  if (req.is('multipart/form-data')) {
    upload.single('audio')(req, res, next);
  } else {
    next();
  }
}

// Run ffmpeg to extract mono 16kHz 16kbps mp3 from videoPath → audioPath.
// Drains stderr to avoid blocking; rejects with last 500 chars of stderr on failure.
function extractAudioMp3(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',                 // overwrite output without asking
      '-i', videoPath,      // input: downloaded video
      '-vn',                // drop video stream
      '-ar', '16000',       // 16 kHz sample rate — standard for speech recognition
      '-ac', '1',           // mono
      '-b:a', '16k',        // 16 kbps bitrate — speech quality, tiny file
      '-f', 'mp3',
      audioPath,
    ]);

    const stderrBufs = [];
    proc.stderr.on('data', (chunk) => stderrBufs.push(chunk)); // must drain or process stalls

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('ffmpeg timed out during audio extraction'));
    }, FFMPEG_TIMEOUT_MS);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        const tail = Buffer.concat(stderrBufs).toString('utf8').slice(-500);
        reject(new Error(`ffmpeg exited ${code}: ${tail}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      // "ENOENT" means ffmpeg is not installed in this environment
      if (err.code === 'ENOENT') {
        reject(new Error('ffmpeg not found — ensure it is installed in the server environment'));
      } else {
        reject(err);
      }
    });
  });
}

// POST /api/transcribe — admin only
// Accepts multipart (field: audio) OR JSON body { url } for server-side fetch + extraction
router.post('/', adminAuth, maybeMulter, async (req, res, next) => {
  let tmpDir = null;
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: 'Transcription not configured (GROQ_API_KEY missing)' });
    }

    let audioBuffer, filename, mimeType;

    if (req.file) {
      // Direct audio upload — multer already enforced 25 MB, no ffmpeg needed
      audioBuffer = req.file.buffer;
      filename = req.file.originalname || 'audio.webm';
      mimeType = req.file.mimetype;

    } else if (req.body?.url) {
      // Server-side fetch + ffmpeg extraction path
      // Video can be any size — we extract audio before sending to Whisper
      tmpDir = await mkdtemp(join(tmpdir(), 'transcribe-'));
      const videoPath = join(tmpDir, 'source');
      const audioPath = join(tmpDir, 'audio.mp3');

      // Stream the video to disk (avoids loading the entire file into memory)
      const dlAbort = new AbortController();
      const dlTimer = setTimeout(() => dlAbort.abort(), DOWNLOAD_TIMEOUT_MS);
      try {
        const response = await fetch(req.body.url, { signal: dlAbort.signal });
        if (!response.ok) {
          return res.status(400).json({ error: `Failed to fetch video: HTTP ${response.status}` });
        }
        await pipeline(Readable.fromWeb(response.body), createWriteStream(videoPath));
      } finally {
        clearTimeout(dlTimer);
      }

      // Extract audio with ffmpeg — 16kHz mono 16kbps mp3
      // A typical 60-min video @ 16kbps = ~7 MB; even 2-hr audio stays under 25 MB
      try {
        await extractAudioMp3(videoPath, audioPath);
      } catch (ffErr) {
        return res.status(422).json({
          error: `Audio extraction failed — unsupported format or corrupt file (${ffErr.message.slice(0, 200)})`,
        });
      }

      // Enforce 25 MB on extracted audio — only fails for extremely long videos (3+ hrs at 16kbps)
      const audioStat = await stat(audioPath);
      if (audioStat.size > MAX_BYTES) {
        const mb = Math.round(audioStat.size / 1024 / 1024);
        return res.status(413).json({
          error: `Extracted audio is ${mb} MB — video is too long for Whisper (25 MB limit). Upload a compressed audio file instead.`,
        });
      }

      audioBuffer = await readFile(audioPath);
      filename = 'audio.mp3';
      mimeType = 'audio/mpeg';

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
    if (err?.name === 'AbortError') return res.status(504).json({ error: 'Timed out downloading video URL' });
    next(err);
  } finally {
    // Always clean up temp files — fire-and-forget, don't await in request path
    if (tmpDir) rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

export default router;
