import { randomUUID } from 'crypto';
import pool from './db.js';

const MODULES = [
  { slug: 'hpv-understanding', title: 'Understanding HPV', description: 'Learn the fundamentals of HPV, how it spreads, and why vaccination matters.', duration: '12 min', category: 'HPV', orderIndex: 0, pointsValue: 100, locked: false },
  { slug: 'hpv-cancer-prevention', title: 'HPV & Cancer Prevention', description: 'Discover how HPV vaccination prevents several types of cancer.', duration: '15 min', category: 'HPV', orderIndex: 1, pointsValue: 150, locked: true },
  { slug: 'menb-overview', title: 'Meningitis B Overview', description: 'Understand Meningitis B — its causes, symptoms, and risks for college students.', duration: '10 min', category: 'MenB', orderIndex: 2, pointsValue: 100, locked: true },
  { slug: 'menb-vaccine', title: 'MenB Vaccination Guide', description: 'Everything you need to know about the Meningitis B vaccine and its benefits.', duration: '18 min', category: 'MenB', orderIndex: 3, pointsValue: 150, locked: true },
  { slug: 'myths-vs-facts', title: 'Vaccine Myths vs Facts', description: 'Debunking common misconceptions about vaccines with scientific evidence.', duration: '20 min', category: 'Bonus', orderIndex: 4, pointsValue: 200, locked: true },
  { slug: 'campus-wellness', title: 'Campus Wellness Resources', description: 'Explore the health resources available to you at NJIT.', duration: '8 min', category: 'Bonus', orderIndex: 5, pointsValue: 75, locked: true },
];

const REWARDS = [
  { title: '$10 Amazon Gift Card', description: 'Redeemable on Amazon.com for anything you need.', pointsCost: 500, category: 'Gift Cards', stock: -1 },
  { title: 'Spotify Premium (1 Month)', description: 'Ad-free music streaming for one month.', pointsCost: 300, category: 'Subscriptions', stock: -1 },
  { title: 'NJIT Campus Store Voucher', description: '$15 voucher for the NJIT Campus Store.', pointsCost: 400, category: 'Campus', stock: 50 },
  { title: 'Netflix Gift Card ($10)', description: 'Stream your favorite shows and movies.', pointsCost: 450, category: 'Gift Cards', stock: -1 },
  { title: 'Campus Café Credit', description: '$5 credit at any NJIT campus café.', pointsCost: 150, category: 'Campus', stock: 100 },
  { title: 'Wellness Tote Bag', description: 'Branded NJIT wellness tote bag.', pointsCost: 200, category: 'Merchandise', stock: 30 },
];

export async function seed() {
  for (const m of MODULES) {
    await pool.query(
      `INSERT INTO modules (id, slug, title, description, duration, category, "orderIndex", "pointsValue", locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (slug) DO NOTHING`,
      [randomUUID(), m.slug, m.title, m.description, m.duration, m.category, m.orderIndex, m.pointsValue, m.locked]
    );
  }

  const { rows } = await pool.query('SELECT COUNT(*) FROM rewards');
  if (parseInt(rows[0].count) === 0) {
    for (const r of REWARDS) {
      await pool.query(
        `INSERT INTO rewards (id, title, description, "pointsCost", category, stock)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), r.title, r.description, r.pointsCost, r.category, r.stock]
      );
    }
  }

  console.log('Seed complete');
}
