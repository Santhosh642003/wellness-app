import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from './db.js';

// Modules synced with frontend moduleContent.js (mapped by orderIndex → m1..m6)
const MODULES = [
  {
    slug: 'hpv-understanding', title: 'Introduction to Vaccines',
    description: 'Learn the basics of how vaccines work and why they matter for public health.',
    duration: '20 min', category: 'Foundations', orderIndex: 0, pointsValue: 100, locked: false,
    keyPoints: ['Vaccines train your immune system without causing disease','Herd immunity protects those who cannot be vaccinated','Vaccines undergo rigorous safety testing before approval','Modern vaccines have eliminated many deadly diseases'],
    transcript: [{time:0,text:'Welcome to the Introduction to Vaccines module.'},{time:4,text:'Vaccines are one of the most important medical advances in history.'},{time:9,text:'They work by training your immune system to recognize and fight specific pathogens.'},{time:15,text:'When you receive a vaccine, your body learns to recognize the pathogen without getting sick.'},{time:22,text:'Your immune system creates memory cells that remember how to fight that disease.'},{time:28,text:'If you later encounter the real pathogen, your body can respond quickly and prevent illness.'},{time:35,text:'Vaccines have eliminated or drastically reduced diseases like polio, measles, and smallpox.'},{time:42,text:'Herd immunity occurs when enough people in a community are immune to a disease.'},{time:49,text:'This protects those who cannot be vaccinated, like newborns and immunocompromised individuals.'},{time:57,text:'Before approval, vaccines go through multiple phases of clinical trials.'},{time:63,text:'Phase 1 tests safety. Phase 2 tests effectiveness. Phase 3 tests in thousands of people.'},{time:72,text:'Only after rigorous review by the FDA and CDC are vaccines approved for public use.'},{time:79,text:"As a college student, staying up to date on vaccines protects you and your community."},{time:86,text:"NJIT's student health services can help you understand which vaccines are recommended."},{time:94,text:"In this module series, you'll learn specifically about HPV and Meningitis B vaccines."},{time:101,text:'Both are strongly recommended for college-age students.'},{time:106,text:"Congratulations on completing the introduction. Let's dive deeper into HPV next."}],
  },
  {
    slug: 'hpv-cancer-prevention', title: 'HPV Vaccine Basics',
    description: 'Understanding HPV, its risks, and how the Gardasil vaccine protects you.',
    duration: '15 min', category: 'HPV', orderIndex: 1, pointsValue: 100, locked: true,
    keyPoints: ['HPV (Human Papillomavirus) is the most common sexually transmitted infection','Most sexually active people will have HPV at some point in their lives','Many HPV infections clear on their own, but some can cause cancer or warts','Gardasil 9 protects against 9 strains of HPV, including cancer-causing types'],
    transcript: [{time:0,text:'This module covers the basics of HPV and the HPV vaccine.'},{time:5,text:'HPV stands for Human Papillomavirus — the most common sexually transmitted infection in the US.'},{time:13,text:"Almost every sexually active person will get HPV at some point if they're not vaccinated."},{time:20,text:'There are over 200 types of HPV. Most infections are harmless and go away on their own.'},{time:28,text:'However, some high-risk types of HPV can cause several types of cancer.'},{time:34,text:'HPV can cause cancers of the cervix, vagina, vulva, penis, anus, and throat.'},{time:42,text:'Low-risk HPV types can cause genital warts, which are not cancerous.'},{time:48,text:'The good news: the HPV vaccine is safe, effective, and can prevent these infections.'},{time:55,text:'Gardasil 9 is the HPV vaccine currently used in the United States.'},{time:61,text:'It protects against 9 types of HPV, including 7 cancer-causing types and 2 wart-causing types.'},{time:70,text:'The vaccine works best when given before exposure to HPV — ideally in preteens ages 11-12.'},{time:78,text:"However, it's recommended for everyone through age 26, and some adults up to age 45."},{time:86,text:"College age is still a great time to get vaccinated if you haven't already."},{time:92,text:'The vaccine is given as a series of 2 or 3 shots, depending on age at first vaccination.'},{time:99,text:'HPV vaccines have an excellent safety record, monitored by the CDC and FDA.'},{time:106,text:'Talk to NJIT Student Health Services about getting the HPV vaccine today.'}],
  },
  {
    slug: 'menb-overview', title: 'HPV & Cancer Prevention',
    description: 'Learn how HPV vaccines reduce cancer risk in both men and women.',
    duration: '22 min', category: 'HPV', orderIndex: 2, pointsValue: 150, locked: true,
    keyPoints: ['HPV causes nearly 36,000 cases of cancer in the US each year','Cervical cancer is the most well-known HPV-related cancer, but not the only one','HPV vaccination can prevent up to 90% of HPV-related cancers','Regular screenings like Pap smears detect cervical changes early'],
    transcript: [{time:0,text:'Welcome to HPV and Cancer Prevention.'},{time:4,text:'HPV is responsible for nearly 36,000 cancer cases in the United States every year.'},{time:11,text:'While cervical cancer is the most commonly known, HPV causes many other cancers too.'},{time:18,text:'These include oropharyngeal, anal, penile, vaginal, and vulvar cancers.'},{time:25,text:'Anyone can be affected — HPV does not discriminate by gender or sexual orientation.'},{time:32,text:"Most HPV infections occur without symptoms, so many people don't know they have it."},{time:39,text:"That's why vaccination is so important — you protect yourself before exposure."},{time:46,text:'Studies show the HPV vaccine can prevent up to 90% of HPV-related cancers.'},{time:53,text:'Since the vaccine was introduced in 2006, HPV infections in teens have dropped by 86%.'},{time:61,text:'For cervical cancer, Pap smears and HPV tests help detect changes early.'},{time:68,text:'The American Cancer Society recommends Pap tests starting at age 25.'},{time:74,text:'When caught early, HPV-related cancers are much more treatable.'},{time:80,text:"For men, there's no equivalent screening test for HPV-related cancers."},{time:86,text:"That's why vaccination is especially critical — it's your primary protection."},{time:93,text:'The HPV vaccine is safe for people who have already been infected with one HPV type.'},{time:100,text:"It will still protect against the other types you haven't encountered."},{time:107,text:'Getting vaccinated now is one of the best investments in your long-term health.'}],
  },
  {
    slug: 'menb-vaccine', title: 'MenB Meningitis Overview',
    description: 'What meningococcal disease is and why college students are at higher risk.',
    duration: '10 min', category: 'MenB', orderIndex: 3, pointsValue: 100, locked: true,
    keyPoints: ['Meningitis B is a life-threatening bacterial infection of the brain and spinal cord lining','College students in dorms have a 3-6x higher risk than other young adults','Symptoms can progress from mild flu-like signs to life-threatening within 24 hours','Early recognition and immediate medical care are critical to survival'],
    transcript: [{time:0,text:'This module covers Meningitis B — a serious disease you need to know about as a college student.'},{time:7,text:'Meningococcal disease is caused by Neisseria meningitidis bacteria.'},{time:13,text:'There are several groups — A, B, C, W, X, and Y — that cause disease worldwide.'},{time:20,text:'Serogroup B (MenB) is the leading cause of bacterial meningitis in college students in the US.'},{time:28,text:'The disease infects the meninges — the membranes surrounding the brain and spinal cord.'},{time:35,text:'It can also cause a bloodstream infection called meningococcal septicemia.'},{time:42,text:'College students, especially freshmen living in residence halls, are at significantly higher risk.'},{time:50,text:'Living in close quarters, sharing drinks, and crowded events all increase spread.'},{time:57,text:'The bacteria spread through respiratory droplets and close contact — kissing or sharing utensils.'},{time:65,text:'Early symptoms include sudden fever, severe headache, stiff neck, and sensitivity to light.'},{time:73,text:"A distinctive rash — red or purple spots that don't fade under pressure — can develop."},{time:81,text:'This disease moves fast. A person can go from healthy to critically ill within hours.'},{time:88,text:'If you or a friend shows these symptoms, seek emergency care immediately — do not wait.'},{time:95,text:'Even with treatment, MenB can cause death or permanent disability.'},{time:101,text:'Survivors may face hearing loss, brain damage, kidney failure, or limb amputations.'},{time:108,text:'The next module covers how vaccination is your best defense against this disease.'}],
  },
  {
    slug: 'myths-vs-facts', title: 'Vaccine Myths vs Facts',
    description: 'Common misconceptions debunked with real scientific evidence.',
    duration: '20 min', category: 'Bonus', orderIndex: 4, pointsValue: 200, locked: true,
    keyPoints: ['Vaccines do NOT cause autism — the 1998 study was retracted and found to be fraudulent','Vaccine ingredients exist in safe, trace amounts well below harmful levels','Natural immunity exists but vaccines provide protection without risky infection',"Vaccine-preventable diseases are still real threats — they haven't disappeared"],
    transcript: [{time:0,text:'In this module, we tackle the most common vaccine myths with evidence-based facts.'},{time:6,text:'Myth #1: Vaccines cause autism.'},{time:9,text:'Fact: This originated from a 1998 paper that was retracted and found to be fraudulent.'},{time:17,text:'The author lost his medical license. Dozens of large studies found no link between vaccines and autism.'},{time:25,text:'Myth #2: The ingredients in vaccines are dangerous.'},{time:29,text:'Fact: Vaccines contain trace amounts of ingredients like aluminum and formaldehyde.'},{time:36,text:'These amounts are far below harmful levels. Your body naturally produces more formaldehyde than any vaccine.'},{time:45,text:'Myth #3: Natural immunity is better than vaccine-induced immunity.'},{time:50,text:'Fact: Natural infection can produce immunity, but it comes with serious risks — including death.'},{time:58,text:'Vaccines give you protection without the dangerous infection.'},{time:64,text:"Myth #4: We don't need vaccines anymore because diseases have disappeared."},{time:70,text:'Fact: Vaccine-preventable diseases still exist worldwide. Unvaccinated communities can have outbreaks.'},{time:78,text:'Measles, whooping cough, and meningitis can all still kill.'},{time:83,text:'Myth #5: Getting many vaccines at once overwhelms the immune system.'},{time:88,text:'Fact: Your immune system handles thousands of antigens daily. Vaccine antigens are a tiny fraction.'},{time:97,text:'Combination vaccines are tested for safety and have been used safely for decades.'},{time:103,text:'Trust the science. Vaccines are one of the greatest public health achievements in human history.'}],
  },
  {
    slug: 'campus-wellness', title: 'Campus Wellness Resources',
    description: 'Explore the full range of health services available to you at NJIT.',
    duration: '12 min', category: 'Bonus', orderIndex: 5, pointsValue: 75, locked: true,
    keyPoints: ['NJIT Student Health Center offers vaccinations, physicals, and mental health referrals','All registered students can access campus health services','Aetna Student Health Insurance is available to NJIT students','TimelyCare provides 24/7 free telehealth to all NJIT students'],
    transcript: [{time:0,text:'Congratulations on making it to the final module — Campus Wellness Resources.'},{time:6,text:'NJIT offers a comprehensive range of health and wellness services to all registered students.'},{time:13,text:'The Campus Center for Health and Wellness is your primary resource for medical care on campus.'},{time:20,text:'Services include general medical care, STI testing, vaccinations, and health screenings.'},{time:27,text:'You can get HPV and MenB vaccines directly at the campus health center.'},{time:33,text:'Check the NJIT health portal for walk-in hours and appointment scheduling.'},{time:39,text:"If you don't have health insurance, NJIT offers the Aetna Student Health plan."},{time:46,text:'This plan covers office visits, prescriptions, hospitalizations, and preventive care.'},{time:53,text:'For mental health, the Campus Counseling Center provides free individual and group counseling.'},{time:60,text:'You can schedule appointments online through the NJIT My Access Portal.'},{time:66,text:'TimelyCare provides 24/7 telehealth services to NJIT students at no cost.'},{time:73,text:'This includes medical visits, mental health support, and health coaching.'},{time:79,text:'Campus recreation includes the Fleisher Athletic Center — gym, pool, and sports courts.'},{time:86,text:'Regular physical activity reduces stress, improves sleep, and boosts immune function.'},{time:93,text:'Take care of yourself — your health is the foundation for your academic success.'},{time:99,text:"You've completed all six modules. Collect your points and head to the rewards store!"}],
  },
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
  { question: 'What does HPV stand for?', options: ['Human Papillomavirus', 'Human Protection Vaccine', 'Health Prevention Virus', 'Hepatitis Prevention Vaccine'], answerIndex: 0, points: 10, explanation: 'HPV stands for Human Papillomavirus.' },
  { question: 'HPV is most commonly spread through…', options: ['Air droplets', 'Skin-to-skin intimate contact', 'Mosquito bites', 'Sharing food'], answerIndex: 1, points: 10 },
  { question: 'HPV infections are often…', options: ['Always severe', 'Symptom-free', 'Always visible', 'Only bacterial'], answerIndex: 1, points: 10, explanation: 'Most HPV infections have no symptoms and clear on their own.' },
  { question: 'HPV vaccination is most effective…', options: ['Before exposure to HPV', 'Only after infection', 'Only after age 50', 'Only if symptoms appear'], answerIndex: 0, points: 10 },
  { question: 'Some HPV types can cause…', options: ['Certain cancers', 'Diabetes', 'Broken bones', 'Asthma'], answerIndex: 0, points: 10 },
  { question: 'MenB refers to meningococcal disease caused by…', options: ['Group A', 'Group B', 'Group C', 'A virus'], answerIndex: 1, points: 10, explanation: 'MenB is caused by serogroup B Neisseria meningitidis.' },
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
  // Upsert modules — metadata fields are always updated; keyPoints, transcript,
  // and videoUrl are only set on first insert (to preserve admin edits).
  for (const m of MODULES) {
    await pool.query(
      `INSERT INTO modules (id, slug, title, description, duration, category, "orderIndex", "pointsValue", locked, "keyPoints", transcript)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (slug) DO UPDATE SET
         title=EXCLUDED.title,
         description=EXCLUDED.description,
         duration=EXCLUDED.duration,
         category=EXCLUDED.category,
         "orderIndex"=EXCLUDED."orderIndex",
         "pointsValue"=EXCLUDED."pointsValue",
         "keyPoints" = CASE
           WHEN modules."keyPoints" IS NULL OR modules."keyPoints" = '[]'::jsonb
           THEN EXCLUDED."keyPoints" ELSE modules."keyPoints" END,
         transcript = CASE
           WHEN modules.transcript IS NULL OR modules.transcript = '[]'::jsonb
           THEN EXCLUDED.transcript ELSE modules.transcript END`,
      [randomUUID(), m.slug, m.title, m.description, m.duration, m.category, m.orderIndex, m.pointsValue, m.locked,
       JSON.stringify(m.keyPoints || []), JSON.stringify(m.transcript || [])]
    );
  }

  // Seed rewards (only if empty)
  const { rows: rCount } = await pool.query('SELECT COUNT(*) FROM rewards');
  if (parseInt(rCount[0].count) === 0) {
    for (const r of REWARDS) {
      await pool.query(
        `INSERT INTO rewards (id, title, description, "pointsCost", category, stock) VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), r.title, r.description, r.pointsCost, r.category, r.stock]
      );
    }
  }

  // Default admin — use ADMIN_EMAIL / ADMIN_PASSWORD env vars if set
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@njit.edu').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const { rows: adminRows } = await pool.query('SELECT id FROM admin_users WHERE email=$1', [adminEmail]);
  if (adminRows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT INTO admin_users (id, email, password, name) VALUES ($1,$2,$3,'Administrator')`,
      [randomUUID(), adminEmail, hashed]
    );
    console.log(`[seed] Admin account created: ${adminEmail}`);
  }

  // Seed quizzes (only if empty)
  const { rows: qCount } = await pool.query('SELECT COUNT(*) FROM quizzes');
  if (parseInt(qCount[0].count) === 0) {
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
