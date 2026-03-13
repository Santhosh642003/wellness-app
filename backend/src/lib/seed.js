import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
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

const MODULE_QUESTIONS = [
  { question: 'What does HPV stand for?', options: ['Human Papillomavirus', 'Human Protection Vaccine', 'Health Prevention Virus', 'Hepatitis Prevention Vaccine'], answerIndex: 0, points: 10 },
  { question: 'HPV is most commonly spread through…', options: ['Air droplets', 'Skin-to-skin intimate contact', 'Mosquito bites', 'Sharing food'], answerIndex: 1, points: 10 },
  { question: 'HPV infections are often…', options: ['Always severe', 'Symptom-free', 'Always visible', 'Only bacterial'], answerIndex: 1, points: 10 },
  { question: 'HPV vaccination is most effective…', options: ['Before exposure to HPV', 'Only after infection', 'Only after age 50', 'Only if symptoms appear'], answerIndex: 0, points: 10 },
  { question: 'Some HPV types can cause…', options: ['Certain cancers', 'Diabetes', 'Broken bones', 'Asthma'], answerIndex: 0, points: 10 },
  { question: 'MenB refers to meningococcal disease caused by…', options: ['Group A', 'Group B', 'Group C', 'A virus'], answerIndex: 1, points: 10 },
  { question: 'A serious warning sign of meningitis can include…', options: ['Stiff neck and fever', 'Better vision', 'Stronger nails', 'Improved sleep'], answerIndex: 0, points: 10 },
  { question: 'MenB can spread through…', options: ['Sharing respiratory secretions', 'Handshakes only', 'Insect bites', 'Water'], answerIndex: 0, points: 10 },
  { question: 'If meningitis is suspected, the best action is to…', options: ['Wait a few days', 'Seek medical help immediately', 'Ignore symptoms', 'Only drink water'], answerIndex: 1, points: 10 },
  { question: 'One campus habit that reduces infection spread is…', options: ['Sharing drinks', 'Not washing hands', 'Avoid sharing drinks', 'Skipping sleep'], answerIndex: 2, points: 10 },
];

const BIWEEKLY_QUESTIONS = [
  { question: 'What does HPV stand for?', options: ['Human Papillomavirus', 'Human Protection Vaccine', 'Health Prevention Virus', 'Hepatitis Prevention Vaccine'], answerIndex: 0, points: 20, explanation: 'HPV stands for Human Papillomavirus.' },
  { question: 'HPV is primarily spread through…', options: ['Air droplets', 'Skin-to-skin intimate contact', 'Sharing food', 'Mosquito bites'], answerIndex: 1, points: 20 },
  { question: 'Some HPV infections can lead to…', options: ['Only the common cold', 'Certain cancers', 'Diabetes', 'Asthma'], answerIndex: 1, points: 20 },
  { question: 'HPV vaccines work best when given…', options: ['After infection', 'Before exposure to HPV', 'Only after age 40', 'Only if symptoms appear'], answerIndex: 1, points: 20 },
  { question: 'HPV infections are often…', options: ['Always severe', 'Symptom-free', 'Only seen in children', 'Only bacterial infections'], answerIndex: 1, points: 20 },
  { question: 'Which is a common prevention strategy for HPV?', options: ['Vaccination', 'Antibiotics', 'Avoiding water', 'Taking vitamin C only'], answerIndex: 0, points: 20 },
  { question: 'HPV vaccines protect against…', options: ['All viruses', 'Some high-risk and wart-causing HPV types', 'Only flu', 'Only COVID-19'], answerIndex: 1, points: 20 },
  { question: 'A Pap test helps detect…', options: ['HPV-related cervical cell changes', 'Diabetes', 'Hearing loss', 'Bone fractures'], answerIndex: 0, points: 20 },
  { question: 'HPV can affect…', options: ['Only women', 'Only men', 'People of any sex', 'Only athletes'], answerIndex: 2, points: 20 },
  { question: 'Genital warts are most often caused by…', options: ['High-risk HPV types', 'Low-risk HPV types', 'Influenza virus', 'Strep bacteria'], answerIndex: 1, points: 20 },
  { question: 'MenB refers to meningococcal disease caused by…', options: ['Group A meningococcus', 'Group B meningococcus', 'Group C meningococcus', 'A virus'], answerIndex: 1, points: 20 },
  { question: 'Meningococcal disease can progress…', options: ['Very slowly over months', 'Very quickly and be life-threatening', 'Only in winter', 'Only in children'], answerIndex: 1, points: 20 },
  { question: 'MenB is spread through…', options: ['Casual handshakes', 'Sharing respiratory secretions (e.g., kissing, sharing drinks)', 'Eating spicy food', 'Insect bites'], answerIndex: 1, points: 20 },
  { question: 'A warning sign of meningitis can include…', options: ['Stiff neck and fever', 'Better sleep quality', 'Stronger nails', 'Improved vision'], answerIndex: 0, points: 20 },
  { question: 'College students may be at higher risk of MenB due to…', options: ['Living in close quarters', 'Using laptops', 'Exercising', 'Studying too much'], answerIndex: 0, points: 20 },
  { question: 'Vaccination can help prevent…', options: ['Only headaches', 'Some forms of meningococcal disease, including MenB', 'All bacterial infections', 'All cancers'], answerIndex: 1, points: 20 },
  { question: 'If you suspect meningitis, you should…', options: ['Wait a week', 'Seek medical help immediately', 'Drink only water', 'Ignore if young'], answerIndex: 1, points: 20 },
  { question: 'Meningococcal disease can cause…', options: ['Meningitis and bloodstream infection', 'Only mild cold', 'Only stomach ache', 'Only seasonal allergies'], answerIndex: 0, points: 20 },
  { question: 'One way to reduce MenB spread on campus is…', options: ['Share drinks', 'Avoid sharing drinks and practice good hygiene', 'Skip sleep', 'Never wash hands'], answerIndex: 1, points: 20 },
  { question: 'MenB symptoms can become severe within…', options: ['Minutes to hours', 'Several years', 'Only after 6 months', 'Only on weekends'], answerIndex: 0, points: 20 },
];

export async function seed() {
  // Seed modules
  for (const m of MODULES) {
    await pool.query(
      `INSERT INTO modules (id, slug, title, description, duration, category, "orderIndex", "pointsValue", locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO NOTHING`,
      [randomUUID(), m.slug, m.title, m.description, m.duration, m.category, m.orderIndex, m.pointsValue, m.locked]
    );
  }

  // Seed rewards
  const { rows: rCount } = await pool.query('SELECT COUNT(*) FROM rewards');
  if (parseInt(rCount[0].count) === 0) {
    for (const r of REWARDS) {
      await pool.query(
        `INSERT INTO rewards (id, title, description, "pointsCost", category, stock) VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), r.title, r.description, r.pointsCost, r.category, r.stock]
      );
    }
  }

  // Seed default admin user
  const { rows: adminRows } = await pool.query(`SELECT id FROM admin_users WHERE email='admin@njit.edu'`);
  if (adminRows.length === 0) {
    const hashed = await bcrypt.hash('Admin@1234', 12);
    await pool.query(
      `INSERT INTO admin_users (id, email, password, name) VALUES ($1,'admin@njit.edu',$2,'Administrator')`,
      [randomUUID(), hashed]
    );
  }

  // Seed quizzes and questions
  const { rows: qCount } = await pool.query('SELECT COUNT(*) FROM quizzes');
  if (parseInt(qCount[0].count) === 0) {
    // One module quiz per module (shared questions)
    const { rows: modules } = await pool.query('SELECT id, title FROM modules ORDER BY "orderIndex"');
    for (const mod of modules) {
      const quizId = randomUUID();
      await pool.query(
        `INSERT INTO quizzes (id, "moduleId", type, title, "passingScore") VALUES ($1,$2,'module',$3,70)`,
        [quizId, mod.id, `${mod.title} Quiz`]
      );
      for (let i = 0; i < MODULE_QUESTIONS.length; i++) {
        const q = MODULE_QUESTIONS[i];
        await pool.query(
          `INSERT INTO quiz_questions (id, "quizId", question, options, "answerIndex", points, explanation, "orderIndex")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [randomUUID(), quizId, q.question, JSON.stringify(q.options), q.answerIndex, q.points, q.explanation || null, i]
        );
      }
    }

    // Biweekly quiz
    const biweeklyId = randomUUID();
    await pool.query(
      `INSERT INTO quizzes (id, "moduleId", type, title, "passingScore") VALUES ($1,NULL,'biweekly','Bi-Weekly Competition',70)`,
      [biweeklyId]
    );
    for (let i = 0; i < BIWEEKLY_QUESTIONS.length; i++) {
      const q = BIWEEKLY_QUESTIONS[i];
      await pool.query(
        `INSERT INTO quiz_questions (id, "quizId", question, options, "answerIndex", points, explanation, "orderIndex")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [randomUUID(), biweeklyId, q.question, JSON.stringify(q.options), q.answerIndex, q.points, q.explanation || null, i]
      );
    }
  }

  console.log('Seed complete');
}
