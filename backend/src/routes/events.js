import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import pool from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { awardPoints } from '../lib/points.js';

const router = Router();
router.use(authenticate);

// GET /api/events
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, "startsAt", "endsAt", "createdAt" FROM events ORDER BY "startsAt" DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/events/:eventId/checkin
router.post('/:eventId/checkin', async (req, res, next) => {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
    const userId = req.userId;

    const { rows: [event] } = await pool.query(
      `SELECT * FROM events WHERE id=$1`, [req.params.eventId]
    );

    if (!event) return res.status(404).json({ error: 'Event not found' });

    const now = new Date();
    const graceCutoff = new Date(new Date(event.endsAt).getTime() + 30 * 60 * 1000);

    if (now < new Date(event.startsAt) || now > graceCutoff) {
      return res.status(400).json({ error: 'Event is not currently active (check-in is open during the event and up to 30 minutes after it ends)' });
    }

    if (event.checkInCode !== code.trim().toUpperCase()) {
      return res.status(400).json({ error: 'Incorrect check-in code — please check the code shown at the event and try again' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [checkin] } = await client.query(
        `INSERT INTO event_checkins (id, "eventId", "userId") VALUES ($1,$2,$3)
         ON CONFLICT ("eventId", "userId") DO NOTHING RETURNING *`,
        [randomUUID(), req.params.eventId, userId]
      );

      if (!checkin) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'You have already checked in to this event' });
      }

      const { awarded } = await awardPoints(client, {
        userId,
        source: 'event_checkin',
        points: 250,
        refId: req.params.eventId,
        capPoints: 1500,
        capScope: 'semester',
      });

      await client.query('COMMIT');
      res.status(201).json({ checkedIn: true, pointsEarned: awarded, eventTitle: event.title });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === 'NO_ACTIVE_SEMESTER') {
        return res.status(503).json({ error: err.message });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

export default router;
