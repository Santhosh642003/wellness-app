export const STORAGE_KEY = "wellness_dashboard_state_v1";

export const INITIAL = {
  user: { name: "Santhosh", initials: "SN" },
  points: 870,
  streakDays: 7,
  lastClaimDate: null,
  modules: [
    {
      id: "m1",
      title: "Introduction to Vaccines",
      desc: "Learn the basics of how vaccines work and why they matter",
      mins: 20,
      points: 50,
      progress: 1,
      locked: false,
      completed: true,
    },
    {
      id: "m2",
      title: "HPV Vaccine Basics",
      desc: "Understanding HPV, its risks, and how the vaccine protects you",
      mins: 15,
      points: 50,
      progress: 1,
      locked: false,
      completed: true,
    },
    {
      id: "m3",
      title: "HPV and Cancer Prevention",
      desc: "Learn how HPV vaccines reduce cancer risk in men and women",
      mins: 22,
      points: 50,
      progress: 0.45,
      locked: false,
      completed: false,
    },
    {
      id: "m4",
      title: "MenB Meningitis Overview",
      desc: "What meningococcal disease is and why college students are at risk",
      mins: 10,
      points: 50,
      progress: 0,
      locked: false,
      completed: false,
    },
    {
      id: "m5",
      title: "HPV Myths vs Facts",
      desc: "Common misconceptions, clarified with real evidence",
      mins: 20,
      points: 50,
      progress: 0,
      locked: true,
      completed: false,
    },
    {
      id: "m6",
      title: "MenB Prevention & Vaccination",
      desc: "How to reduce risk and when to consider vaccination",
      mins: 20,
      points: 50,
      progress: 0,
      locked: true,
      completed: false,
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
