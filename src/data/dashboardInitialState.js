export const DASHBOARD_STORAGE_KEY = "wellness_dashboard_state_v1";

export const INITIAL_DASHBOARD_STATE = {
  user: { name: "Santhosh", initials: "SN" },
  points: 870,
  streakDays: 7,
  lastClaimDate: null,
  modules: [
    {
      id: "m1",
      title: "HPV Vaccine Basics",
      desc: "Understanding HPV, its risks, and how the vaccine protects you",
      meta: "Module 2 out of 8 • ~15 min remaining",
      points: 50,
      progress: 0.58,
      locked: false,
      completed: false,
    },
    {
      id: "m2",
      title: "HPV and Cancer Prevention",
      desc: "Learn how HPV vaccines reduce cancer risk in both men and women",
      meta: "Module 3 out of 8 • ~22 min",
      points: 50,
      progress: 0,
      locked: true,
      completed: false,
    },
  ],
};
