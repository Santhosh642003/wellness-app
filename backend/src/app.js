import cors from 'cors';
import express from 'express';

import adminRouter from './routes/adminRoutes.js';
import authRouter from './routes/authRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import healthRouter from './routes/healthRoutes.js';
import moduleRouter from './routes/moduleRoutes.js';
import rewardRouter from './routes/rewardRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/modules', moduleRouter);
app.use('/api/rewards', rewardRouter);
app.use('/api/admin', adminRouter);

app.use((error, _req, res) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found.` });
});

export default app;
