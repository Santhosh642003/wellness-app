export function errorHandler(err, req, res, next) {
  // Log full stack in dev, only unexpected 5xx in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd || !err.status || err.status >= 500) {
    console.error(isProd ? err.message : (err.stack || err));
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // PostgreSQL unique-constraint violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }

  // Multer file-size exceeded
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }

  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
