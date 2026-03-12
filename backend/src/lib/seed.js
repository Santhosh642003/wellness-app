import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const modules = [
  {
    slug: 'hpv-understanding',
    title: 'Understanding HPV',
    description: 'Learn the fundamentals of HPV, how it spreads, and why vaccination matters.',
    duration: '12 min',
    category: 'HPV',
    orderIndex: 0,
    pointsValue: 100,
    locked: false,
  },
  {
    slug: 'hpv-cancer-prevention',
    title: 'HPV & Cancer Prevention',
    description: 'Discover how HPV vaccination prevents several types of cancer.',
    duration: '15 min',
    category: 'HPV',
    orderIndex: 1,
    pointsValue: 150,
    locked: true,
  },
  {
    slug: 'menb-overview',
    title: 'Meningitis B Overview',
    description: 'Understand Meningitis B — its causes, symptoms, and risks for college students.',
    duration: '10 min',
    category: 'MenB',
    orderIndex: 2,
    pointsValue: 100,
    locked: true,
  },
  {
    slug: 'menb-vaccine',
    title: 'MenB Vaccination Guide',
    description: 'Everything you need to know about the Meningitis B vaccine and its benefits.',
    duration: '18 min',
    category: 'MenB',
    orderIndex: 3,
    pointsValue: 150,
    locked: true,
  },
  {
    slug: 'myths-vs-facts',
    title: 'Vaccine Myths vs Facts',
    description: 'Debunking common misconceptions about vaccines with scientific evidence.',
    duration: '20 min',
    category: 'Bonus',
    orderIndex: 4,
    pointsValue: 200,
    locked: true,
  },
  {
    slug: 'campus-wellness',
    title: 'Campus Wellness Resources',
    description: 'Explore the health resources available to you at NJIT.',
    duration: '8 min',
    category: 'Bonus',
    orderIndex: 5,
    pointsValue: 75,
    locked: true,
  },
];

const rewards = [
  {
    title: '$10 Amazon Gift Card',
    description: 'Redeemable on Amazon.com for anything you need.',
    pointsCost: 500,
    category: 'Gift Cards',
    stock: -1,
  },
  {
    title: 'Spotify Premium (1 Month)',
    description: 'Ad-free music streaming for one month.',
    pointsCost: 300,
    category: 'Subscriptions',
    stock: -1,
  },
  {
    title: 'NJIT Campus Store Voucher',
    description: '$15 voucher for the NJIT Campus Store.',
    pointsCost: 400,
    category: 'Campus',
    stock: 50,
  },
  {
    title: 'Netflix Gift Card ($10)',
    description: 'Stream your favorite shows and movies.',
    pointsCost: 450,
    category: 'Gift Cards',
    stock: -1,
  },
  {
    title: 'Campus Café Credit',
    description: '$5 credit at any NJIT campus café.',
    pointsCost: 150,
    category: 'Campus',
    stock: 100,
  },
  {
    title: 'Wellness Tote Bag',
    description: 'Branded NJIT wellness tote bag.',
    pointsCost: 200,
    category: 'Merchandise',
    stock: 30,
  },
];

async function seed() {
  console.log('Seeding database...');

  // Upsert modules
  for (const module of modules) {
    await prisma.module.upsert({
      where: { slug: module.slug },
      update: module,
      create: module,
    });
  }
  console.log(`Seeded ${modules.length} modules`);

  // Upsert rewards
  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: { id: reward.title }, // use title as stable ID for seeding
      update: reward,
      create: reward,
    }).catch(async () => {
      // If not found by id, create
      const existing = await prisma.reward.findFirst({ where: { title: reward.title } });
      if (!existing) {
        await prisma.reward.create({ data: reward });
      }
    });
  }

  // Simpler reward seeding - delete and recreate only if empty
  const rewardCount = await prisma.reward.count();
  if (rewardCount === 0) {
    await prisma.reward.createMany({ data: rewards });
    console.log(`Seeded ${rewards.length} rewards`);
  } else {
    console.log(`Rewards already seeded (${rewardCount} found)`);
  }

  console.log('Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
