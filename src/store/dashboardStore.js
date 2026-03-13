export const STORAGE_KEY = "wellness_dashboard_state_v1";

export const INITIAL = {
  user: { name: "Santhosh", initials: "SN", plan: "plus" },
  points: 870,
  streakDays: 7,
  lastClaimDate: null,
  modules: [
    {
      id: "m1",
      title: "Introduction to Vaccines",
      desc: "Learn the basics of how vaccines work and why they matter for public health",
      mins: 20,
      points: 100,
      progress: 1,
      locked: false,
      completed: true,
      category: "Foundations",
    },
    {
      id: "m2",
      title: "HPV Vaccine Basics",
      desc: "Understanding HPV, its risks, and how the Gardasil vaccine protects you",
      mins: 15,
      points: 100,
      progress: 1,
      locked: false,
      completed: true,
      category: "HPV",
    },
    {
      id: "m3",
      title: "HPV & Cancer Prevention",
      desc: "Learn how HPV vaccines reduce cancer risk in both men and women",
      mins: 22,
      points: 150,
      progress: 0.45,
      locked: false,
      completed: false,
      category: "HPV",
    },
    {
      id: "m4",
      title: "MenB Meningitis Overview",
      desc: "What meningococcal disease is and why college students are at higher risk",
      mins: 10,
      points: 100,
      progress: 0,
      locked: false,
      completed: false,
      category: "MenB",
    },
    {
      id: "m5",
      title: "Vaccine Myths vs Facts",
      desc: "Common misconceptions debunked with real scientific evidence",
      mins: 20,
      points: 200,
      progress: 0,
      locked: true,
      completed: false,
      category: "Bonus",
    },
    {
      id: "m6",
      title: "Campus Wellness Resources",
      desc: "Explore the full range of health services available to you at NJIT",
      mins: 12,
      points: 75,
      progress: 0,
      locked: true,
      completed: false,
      category: "Bonus",
    },
  ],
};

export function safeLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function safeSave(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
