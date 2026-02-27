/* global process */
import app from './app.js';
import { initDatabase } from './db/database.js';

const PORT = process.env.PORT || 4000;

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Wellness API listening on http://localhost:${PORT}`);
  });
}

startServer();
