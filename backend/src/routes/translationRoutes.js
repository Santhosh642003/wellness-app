/* global process */
import { Router } from 'express';

const translationRouter = Router();

translationRouter.post('/live', async (req, res) => {
  const { text, targetLanguage = 'es' } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'text is required.' });
  }

  const providerUrl = process.env.TRANSLATION_API_URL;

  if (!providerUrl) {
    return res.json({ translatedText: `[${targetLanguage}] ${text}` });
  }

  const response = await fetch(providerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'auto', target: targetLanguage, format: 'text' }),
  });

  if (!response.ok) {
    return res.status(502).json({ message: 'Translation provider failed.' });
  }

  const payload = await response.json();
  return res.json({ translatedText: payload.translatedText || text });
});

export default translationRouter;
