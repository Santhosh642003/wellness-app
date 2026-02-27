/* global process */
import app from './app.js';
import { initDatabase } from './db/database.js';
import { seedData } from './db/seedData.js';

const PORT = process.env.PORT || 4000;

async function startServer() {
  await initDatabase();
  await seedData();

  app.listen(PORT, () => {
    console.log(`Wellness API listening on http://localhost:${PORT}`);
  });
}

startServer();
