import { randomUUID, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from './db.js';

// Public-domain sample video URLs (Google's gtv sample bucket, no auth required)
const V = {
  BBB:     'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  ELEPH:   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  BLAZE:   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ESCAPE:  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  FUN:     'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  JOY:     'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  SINTEL:  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  TEARS:   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
};

const TEST_MODULES = [
  {
    slug: 'test-vaccine-basics',
    title: '[TEST] Vaccine Basics',
    description: 'A quick introduction to how vaccines work and why they matter for your campus health.',
    duration: '10',
    category: 'Foundations',
    orderIndex: 1000,
    pointsValue: 100,
    locked: false,
    videoUrl: V.BBB,
    videos: [],
    keyPoints: ['Vaccines train your immune system without causing disease', 'Herd immunity protects those who cannot be vaccinated', 'Side effects are typically mild and short-lived'],
    quiz: {
      title: '[TEST] Vaccine Basics Quiz',
      passingScore: 70,
      questions: [
        { question: 'What is the primary purpose of a vaccine?', options: ['Treat an existing infection', 'Train the immune system to recognize a pathogen', 'Relieve symptoms of illness', 'Replace antibiotics'], answerIndex: 1, points: 10, explanation: 'Vaccines expose your immune system to a safe form of the pathogen so it learns to fight it.' },
        { question: 'What is herd immunity?', options: ['Immunity gained from eating meat', 'When everyone in a group is vaccinated', 'Indirect protection when enough people are immune', 'A type of natural immunity from birth'], answerIndex: 2, points: 10, explanation: 'Herd immunity occurs when enough of a population is immune, slowing the spread to unprotected individuals.' },
        { question: 'Which of the following best describes a common vaccine side effect?', options: ['Severe allergic reaction lasting weeks', 'The disease the vaccine targets', 'Mild soreness at the injection site', 'Permanent immune suppression'], answerIndex: 2, points: 10, explanation: 'Mild side effects like soreness or a low-grade fever are normal signs the immune system is responding.' },
      ],
    },
  },
  {
    slug: 'test-hpv-prevention-series',
    title: '[TEST] HPV Prevention Series',
    description: 'A three-part series covering HPV basics, the benefits of vaccination, and how to get vaccinated on campus.',
    duration: '18',
    category: 'HPV',
    orderIndex: 1001,
    pointsValue: 150,
    locked: false,
    videoUrl: V.BLAZE,
    videos: [
      { id: randomUUID(), title: 'What is HPV?', url: V.BLAZE, duration: '6:00' },
      { id: randomUUID(), title: 'HPV Vaccine Benefits', url: V.ESCAPE, duration: '6:00' },
      { id: randomUUID(), title: 'Getting Vaccinated on Campus', url: V.FUN, duration: '6:00' },
    ],
    keyPoints: ['HPV is the most common sexually transmitted infection', 'The HPV vaccine prevents most HPV-related cancers', 'Vaccination is recommended for all people up to age 26'],
    quiz: {
      title: '[TEST] HPV Prevention Quiz',
      passingScore: 70,
      questions: [
        { question: 'Which type of cancer is NOT associated with HPV?', options: ['Cervical cancer', 'Oropharyngeal cancer', 'Lung cancer', 'Anal cancer'], answerIndex: 2, points: 10, explanation: 'HPV is linked to cervical, anal, oropharyngeal, and other cancers but not lung cancer.' },
        { question: 'How many doses of HPV vaccine are recommended for most people starting the series before age 15?', options: ['1', '2', '3', '4'], answerIndex: 1, points: 10, explanation: 'Two doses are recommended when the series is started before age 15; three doses for those starting at 15 or older.' },
        { question: 'HPV vaccination is recommended for:', options: ['Only females under age 18', 'All people up to age 26 and some up to age 45', 'Only people who are sexually active', 'Only healthcare workers'], answerIndex: 1, points: 10, explanation: 'CDC recommends HPV vaccination for all people through age 26, and shared clinical decision-making for ages 27–45.' },
      ],
    },
  },
  {
    slug: 'test-menb-awareness',
    title: '[TEST] MenB Awareness',
    description: 'Two-part module covering the meningococcal B disease and its impact on college campuses.',
    duration: '12',
    category: 'MenB',
    orderIndex: 1002,
    pointsValue: 125,
    locked: false,
    videoUrl: V.JOY,
    videos: [
      { id: randomUUID(), title: 'Understanding Meningococcal B', url: V.JOY, duration: '6:00' },
      { id: randomUUID(), title: 'MenB Vaccination & College Life', url: V.SINTEL, duration: '6:00' },
    ],
    keyPoints: ['MenB bacteria spread through respiratory droplets and saliva', 'College students in residence halls face elevated risk', 'The MenB vaccine provides protection against serogroup B strains'],
    quiz: {
      title: '[TEST] MenB Awareness Quiz',
      passingScore: 70,
      questions: [
        { question: 'How does meningococcal B spread?', options: ['Through contaminated food', 'Through respiratory droplets and close contact', 'Through insect bites', 'Through water'], answerIndex: 1, points: 10, explanation: 'MenB spreads through respiratory droplets, saliva, and close personal contact.' },
        { question: 'Which college students are at highest risk for meningococcal disease?', options: ['Part-time students', 'Those living in residence halls', 'Graduate students', 'Students taking online classes only'], answerIndex: 1, points: 10, explanation: 'Living in residence halls increases exposure risk due to close living quarters and shared spaces.' },
        { question: 'The MenB vaccine protects against:', options: ['All strains of Neisseria meningitidis', 'Serogroup B strains specifically', 'Bacterial and viral meningitis', 'Streptococcal infections'], answerIndex: 1, points: 10, explanation: 'The MenB vaccine specifically targets serogroup B, which causes ~60% of meningococcal disease in college students.' },
      ],
    },
  },
  {
    slug: 'test-financial-wellness',
    title: '[TEST] Financial Wellness',
    description: 'Practical two-part guide to budgeting and managing student debt so money stress does not derail your studies.',
    duration: '14',
    category: 'Bonus',
    orderIndex: 1003,
    pointsValue: 100,
    locked: false,
    videoUrl: V.TEARS,
    videos: [
      { id: randomUUID(), title: 'Budgeting Basics for Students', url: V.TEARS, duration: '7:00' },
      { id: randomUUID(), title: 'Managing Student Debt', url: V.ELEPH, duration: '7:00' },
    ],
    keyPoints: ['Track every dollar: income, fixed costs, and discretionary spending', 'Federal loans offer income-driven repayment options', 'Emergency fund of even $500 prevents most financial crises'],
    quiz: {
      title: '[TEST] Financial Wellness Quiz',
      passingScore: 70,
      questions: [
        { question: 'What is the 50/30/20 budgeting rule?', options: ['50% savings, 30% needs, 20% wants', '50% needs, 30% wants, 20% savings', '50% wants, 30% savings, 20% needs', '50% debt repayment, 30% needs, 20% fun'], answerIndex: 1, points: 10, explanation: 'The 50/30/20 rule allocates 50% to needs, 30% to wants, and 20% to savings and debt repayment.' },
        { question: 'Income-driven repayment plans for federal student loans base payments on:', options: ['Your credit score', 'Your income and family size', 'The interest rate of your loan', 'Your GPA'], answerIndex: 1, points: 10, explanation: 'IDR plans cap monthly payments at a percentage of your discretionary income and family size.' },
        { question: 'Why is having an emergency fund important?', options: ['It earns the highest interest rate', 'It prevents small crises from becoming debt spirals', 'It is required by law for students', 'It automatically pays tuition'], answerIndex: 1, points: 10, explanation: 'An emergency fund acts as a buffer so unexpected expenses do not force you into high-interest debt.' },
      ],
    },
  },
  {
    slug: 'test-mental-health-101',
    title: '[TEST] Mental Health 101',
    description: 'Recognize the signs of common mental health challenges and learn about the support services available at NJIT.',
    duration: '8',
    category: 'General',
    orderIndex: 1004,
    pointsValue: 100,
    locked: false,
    videoUrl: V.BBB,
    videos: [],
    keyPoints: ['1 in 4 college students experiences a diagnosable mental health condition', 'Early intervention leads to better outcomes', 'NJIT Counseling Center offers free confidential support'],
    quiz: {
      title: '[TEST] Mental Health 101 Quiz',
      passingScore: 70,
      questions: [
        { question: 'Which of the following is a warning sign of depression?', options: ['Increased energy and productivity', 'Persistent feelings of sadness or emptiness', 'Better-than-average sleep quality', 'Heightened interest in all activities'], answerIndex: 1, points: 10, explanation: 'Persistent sadness, loss of interest, and fatigue are key warning signs of depression.' },
        { question: 'What should you do first if a friend expresses thoughts of suicide?', options: ['Tell them to snap out of it', 'Ignore it, they are just venting', 'Listen non-judgmentally and help them access professional support', 'Post about it on social media'], answerIndex: 2, points: 10, explanation: 'Taking any mention of suicide seriously, listening without judgment, and connecting them to resources saves lives.' },
        { question: 'NJIT\'s Counseling Center services are:', options: ['Only available to graduate students', 'Paid out-of-pocket by students', 'Confidential and included with student fees', 'Available only via referral from a doctor'], answerIndex: 2, points: 10, explanation: 'NJIT Counseling Center provides free, confidential mental health services to all enrolled students.' },
      ],
    },
  },
  {
    slug: 'test-healthy-sleep',
    title: '[TEST] Healthy Sleep Habits',
    description: 'Understand sleep science and build habits that boost your academic performance and immune health.',
    duration: '9',
    category: 'General',
    orderIndex: 1005,
    pointsValue: 100,
    locked: false,
    videoUrl: V.FUN,
    videos: [],
    keyPoints: ['College students need 7-9 hours of sleep per night', 'Sleep deprivation weakens the immune system', 'A consistent sleep schedule anchors your circadian rhythm'],
    quiz: {
      title: '[TEST] Healthy Sleep Quiz',
      passingScore: 70,
      questions: [
        { question: 'How many hours of sleep do most college students need per night?', options: ['4–5 hours', '5–6 hours', '7–9 hours', '10–12 hours'], answerIndex: 2, points: 10, explanation: 'National Sleep Foundation recommends 7-9 hours for adults aged 18-25.' },
        { question: 'Which habit most helps maintain a healthy sleep schedule?', options: ['Drinking caffeine before bed', 'Waking up at the same time every day', 'Taking long naps in the evening', 'Using bright screens until you fall asleep'], answerIndex: 1, points: 10, explanation: 'A consistent wake time anchors your circadian rhythm, making it easier to fall and stay asleep.' },
        { question: 'How does sleep deprivation affect vaccine efficacy?', options: ['It has no effect on vaccine response', 'It boosts immune response to vaccines', 'It can reduce the antibody response to vaccines', 'It speeds up vaccine absorption'], answerIndex: 2, points: 10, explanation: 'Studies show that sleep-deprived individuals produce fewer antibodies after vaccination, reducing its effectiveness.' },
      ],
    },
  },
];

export async function seed() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@njit.edu').toLowerCase();
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = randomBytes(16).toString('hex');
    console.warn(`[seed] ADMIN_PASSWORD not set — generated one-time dev password for ${adminEmail}: ${adminPassword}`);
    console.warn('[seed] Set ADMIN_PASSWORD in your .env to use a stable password across restarts.');
  }

  const { rows } = await pool.query('SELECT id FROM admin_users WHERE email=$1', [adminEmail]);
  if (rows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 14);
    await pool.query(
      `INSERT INTO admin_users (id, email, password, name) VALUES ($1,$2,$3,'Administrator')`,
      [randomUUID(), adminEmail, hashed]
    );
    console.log(`[seed] Admin account created: ${adminEmail}`);
  }

  // [TEST] modules — functional during development/QA so the quiz/points flow can be verified.
  // They award real points (675 total across 6 modules) and are completable by any registered user.
  // LAUNCH CHECKLIST (M4): before onboarding real students, decide whether to:
  //   (a) delete them via the admin panel, or
  //   (b) set SEED_TEST_MODULES=false in Railway env to skip seeding on future restarts.
  // Do NOT remove them automatically here — that decision belongs to the launch workflow.
  if (process.env.SEED_TEST_MODULES === 'false') {
    console.log('[seed] SEED_TEST_MODULES=false — skipping [TEST] module seeding');
    return;
  }

  // Insert [TEST] modules + their quizzes if they don't already exist
  const { rows: existing } = await pool.query(`SELECT slug FROM modules WHERE slug LIKE 'test-%'`);
  const existingSlugs = new Set(existing.map((r) => r.slug));

  for (const mod of TEST_MODULES) {
    if (existingSlugs.has(mod.slug)) continue;

    const moduleId = randomUUID();
    const videos = mod.videos.length > 0 ? mod.videos : [];
    const videoUrl = mod.videoUrl || videos[0]?.url || '';

    await pool.query(
      `INSERT INTO modules
         (id, slug, title, description, duration, category, "orderIndex", "pointsValue",
          locked, "videoUrl", "keyPoints", transcript, videos, documents)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        moduleId, mod.slug, mod.title, mod.description, mod.duration, mod.category,
        mod.orderIndex, mod.pointsValue, mod.locked, videoUrl,
        JSON.stringify(mod.keyPoints || []), JSON.stringify([]),
        JSON.stringify(videos), JSON.stringify([]),
      ]
    );

    if (mod.quiz) {
      const quizId = randomUUID();
      await pool.query(
        `INSERT INTO quizzes (id, "moduleId", type, title, "passingScore")
         VALUES ($1,$2,'module',$3,$4)`,
        [quizId, moduleId, mod.quiz.title, mod.quiz.passingScore]
      );
      for (let i = 0; i < mod.quiz.questions.length; i++) {
        const q = mod.quiz.questions[i];
        await pool.query(
          `INSERT INTO quiz_questions (id, "quizId", question, options, "answerIndex", points, explanation, "orderIndex")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [randomUUID(), quizId, q.question, JSON.stringify(q.options), q.answerIndex, q.points, q.explanation, i]
        );
      }
    }

    console.log(`[seed] Created test module: ${mod.title}`);
  }
}
