import { useEffect, useMemo, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { INITIAL, safeLoad, safeSave } from "../store/dashboardStore";

const CATEGORIES = [
  { key: "all", label: "All Rewards" },
  { key: "gift", label: "Gift Cards" },
  { key: "subs", label: "Subscriptions" },
  { key: "campus", label: "Campus Perks" },
];

const REWARDS = [
  {
    id: "r-featured-amazon10",
    featured: true,
    title: "Amazon Gift Card - $10",
    desc: "Shop for anything you need with this versatile gift card",
    cost: 1000,
    category: "gift",
    cta: "Redeem Now",
    badge: "Featured Reward",
    accent: "yellow",
  },
  { id: "r-amazon5", title: "Amazon Gift Card", subtitle: "$5", cost: 500, category: "gift" },
  { id: "r-starbucks5", title: "Starbucks Gift Card", subtitle: "$5", cost: 500, category: "gift" },
  { id: "r-target10", title: "Target Gift Card", subtitle: "$10", cost: 500, category: "gift" },
  { id: "r-walmart10", title: "Walmart Gift Card", subtitle: "$10", cost: 500, category: "gift" },
  { id: "r-spotify", title: "Spotify Premium", subtitle: "1 Month", cost: 500, category: "subs" },
  { id: "r-doordash5", title: "Doordash Credit", subtitle: "$5", cost: 500, category: "subs" },
  // Add campus perks later
];

function formatPoints(n) {
  return `${n} points`;
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-gray-800 text-gray-200">
      {children}
    </span>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-xl text-sm font-semibold border transition
        ${
          active
            ? "bg-[#121212] border-emerald-400/50 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
            : "bg-[#121212] border-gray-800 hover:border-gray-700 text-gray-200"
        }`}
    >
      {children}
    </button>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#121212] border border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/5 border border-gray-800 hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function Rewards() {
  const [data, setData] = useState(INITIAL);

  // Toast
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // Load/save shared state
  useEffect(() => {
    const loaded = safeLoad();
    if (loaded) {
      setData((prev) => ({
        ...prev,
        ...loaded,
        user: { ...prev.user, ...(loaded.user || {}) },
        modules: Array.isArray(loaded.modules) ? loaded.modules : prev.modules,
      }));
    }
  }, []);

  useEffect(() => {
    safeSave(data);
  }, [data]);

  // UI state
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);

  const featured = useMemo(() => REWARDS.find((r) => r.featured), []);
  const list = useMemo(() => {
    const items = REWARDS.filter((r) => !r.featured);
    if (activeTab === "all") return items;
    return items.filter((r) => r.category === activeTab);
  }, [activeTab]);

  const openRedeem = (reward) => {
    setSelectedReward(reward);
    setModalOpen(true);
  };

  const closeRedeem = () => {
    setModalOpen(false);
    setSelectedReward(null);
  };

  const canAfford = (cost) => data.points >= cost;

  const redeem = () => {
    if (!selectedReward) return;

    if (!canAfford(selectedReward.cost)) {
      setToast("❌ Not enough points");
      return;
    }

    setData((prev) => ({ ...prev, points: prev.points - selectedReward.cost }));
    setToast(`✅ Redeemed ${selectedReward.title}`);
    closeRedeem();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav
        points={data.points}
        streakDays={data.streakDays}
        initials={data.user.initials}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-semibold">Rewards Store</h1>
          <p className="text-gray-400 mt-2">
            Redeem your points for gift cards and rewards
          </p>
        </header>

        {/* Featured */}
        {featured && (
          <section className="bg-[#121212] border border-yellow-300/25 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-2">
                <Badge>{featured.badge}</Badge>
                <h2 className="text-xl font-semibold mt-2">{featured.title}</h2>
                <p className="text-gray-400 text-sm">{featured.desc}</p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-black/30 border border-gray-800 text-sm font-semibold">
                    {formatPoints(featured.cost)}
                  </div>

                  <button
                    onClick={() => openRedeem(featured)}
                    className="px-6 py-3 rounded-xl font-semibold bg-yellow-400 text-black hover:brightness-110 transition"
                  >
                    {featured.cta}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tabs */}
        <section className="flex flex-wrap items-center gap-3">
          {CATEGORIES.map((c) => (
            <TabButton
              key={c.key}
              active={activeTab === c.key}
              onClick={() => setActiveTab(c.key)}
            >
              {c.label}
            </TabButton>
          ))}
        </section>

        {/* Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {list.map((r) => {
            const affordable = data.points >= r.cost;

            return (
              <div
                key={r.id}
                className="bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-lg font-semibold">{r.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{r.subtitle}</p>

                <div className="mt-5 px-4 py-2 rounded-xl bg-black/30 border border-gray-800 text-sm font-semibold w-fit">
                  {formatPoints(r.cost)}
                </div>

                <button
                  onClick={() => openRedeem(r)}
                  className={`mt-5 w-full px-5 py-3 rounded-xl font-semibold transition-transform
                    ${
                      affordable
                        ? "bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:scale-[1.01]"
                        : "bg-[#1a1a1a] border border-gray-800 text-gray-400 cursor-not-allowed"
                    }`}
                  disabled={!affordable}
                >
                  Redeem
                </button>

                {!affordable && (
                  <p className="text-xs text-gray-500 mt-3">
                    Earn more points to redeem this reward.
                  </p>
                )}
              </div>
            );
          })}
        </section>
      </main>

      {/* Redeem Modal */}
      <Modal
        open={modalOpen}
        title="Confirm Redemption"
        onClose={closeRedeem}
      >
        {selectedReward && (
          <div className="space-y-4">
            <div className="bg-black/25 border border-gray-800 rounded-2xl p-4">
              <p className="text-sm text-gray-300">
                You’re about to redeem:
              </p>
              <p className="text-lg font-semibold mt-1">{selectedReward.title}</p>
              {selectedReward.subtitle && (
                <p className="text-sm text-gray-400 mt-1">{selectedReward.subtitle}</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Cost</span>
                <span className="font-semibold text-yellow-300">
                  {formatPoints(selectedReward.cost)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-400">Your points</span>
                <span className="font-semibold">{data.points}</span>
              </div>
            </div>

            {!canAfford(selectedReward.cost) && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                Not enough points for this reward.
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={closeRedeem}
                className="flex-1 px-5 py-3 rounded-xl font-semibold bg-white/5 border border-gray-800 hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                onClick={redeem}
                disabled={!canAfford(selectedReward.cost)}
                className={`flex-1 px-5 py-3 rounded-xl font-semibold transition
                  ${
                    canAfford(selectedReward.cost)
                      ? "bg-yellow-400 text-black hover:brightness-110"
                      : "bg-[#1a1a1a] border border-gray-800 text-gray-400 cursor-not-allowed"
                  }`}
              >
                Redeem
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
