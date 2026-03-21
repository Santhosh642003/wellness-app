import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import Toast from "../components/Toast";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { rewards as rewardsApi, users as usersApi } from "../lib/api";

const CATEGORY_MAP = {
  "Gift Cards": "gift",
  "Subscriptions": "subs",
  "Campus": "campus",
  "Merchandise": "merch",
};

const TABS = [
  { key: "all", label: "All Rewards" },
  { key: "gift", label: "Gift Cards" },
  { key: "subs", label: "Subscriptions" },
  { key: "campus", label: "Campus Perks" },
  { key: "merch", label: "Merchandise" },
];

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Rewards() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [rewardsList, setRewardsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [userData, rwds] = await Promise.all([
        usersApi.get(user.id),
        rewardsApi.list(),
      ]);
      setPoints(userData.progress?.points || 0);
      setRewardsList(rwds || []);
    } catch (err) {
      console.error("Failed to load rewards", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return rewardsList;
    return rewardsList.filter((r) => {
      const key = CATEGORY_MAP[r.category] || r.category.toLowerCase();
      return key === activeTab;
    });
  }, [rewardsList, activeTab]);

  const openRedeem = (r) => { setSelectedReward(r); setModalOpen(true); };
  const closeRedeem = () => { setModalOpen(false); setSelectedReward(null); };

  const redeem = async () => {
    if (!selectedReward || !user?.id) return;
    if (points < selectedReward.pointsCost) { setToast("❌ Not enough points"); return; }
    setRedeeming(true);
    try {
      await rewardsApi.redeem(user.id, selectedReward.id);
      setPoints((p) => p - selectedReward.pointsCost);
      setToast(`✅ Redeemed ${selectedReward.title}`);
      closeRedeem();
    } catch (err) {
      setToast(err.data?.error || "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-[var(--text-muted)] animate-pulse">Loading rewards…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav points={points} streakDays={0} initials={user?.initials || "?"} />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 w-full">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Rewards Store</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2">Redeem your points for gift cards and rewards</p>
          <div className="mt-2 text-sm text-slate-600 dark:text-gray-400">
            You have <span className="font-bold text-yellow-600 dark:text-yellow-300">{points}</span> points
          </div>
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                activeTab === t.key
                  ? "bg-slate-900 dark:bg-white/10 border-slate-700 dark:border-gray-600 text-white dark:text-white"
                  : "bg-white dark:bg-[#121212] border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:border-slate-300 dark:hover:border-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-500">No rewards in this category yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((r) => {
              const affordable = points >= r.pointsCost;
              const outOfStock = r.stock === 0;
              return (
                <div key={r.id} className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {r.imageUrl && (
                    <div className="h-40 bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden">
                      <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{r.title}</h3>
                  <p className="text-slate-500 dark:text-gray-400 text-sm mt-1 flex-1">{r.description}</p>
                  <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-gray-800 text-sm font-semibold text-slate-700 dark:text-gray-200">
                    {r.pointsCost} points
                  </div>
                  {r.stock > 0 && (
                    <div className="text-xs text-slate-400 dark:text-gray-500 mt-2">{r.stock} left</div>
                  )}
                  <button
                    onClick={() => openRedeem(r)}
                    disabled={!affordable || outOfStock}
                    className={`mt-4 w-full px-5 py-3 rounded-xl font-semibold transition ${
                      outOfStock ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500 cursor-not-allowed border border-slate-200 dark:border-gray-800"
                        : affordable ? "bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90"
                        : "bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {outOfStock ? "Out of Stock" : affordable ? "Redeem" : "Need More Points"}
                  </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Modal open={modalOpen} title="Confirm Redemption" onClose={closeRedeem}>
        {selectedReward && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-black/25 border border-slate-200 dark:border-gray-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-gray-400">You're about to redeem:</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{selectedReward.title}</p>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{selectedReward.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-gray-400">Cost</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-300">{selectedReward.pointsCost} pts</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-gray-400">Your points</span>
                <span className="font-semibold text-slate-900 dark:text-white">{points}</span>
              </div>
              {points < selectedReward.pointsCost && (
                <div className="mt-3 text-sm text-red-500 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                  Not enough points for this reward.
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={closeRedeem} className="flex-1 px-5 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
              <button
                onClick={redeem}
                disabled={points < selectedReward.pointsCost || redeeming}
                className={`flex-1 px-5 py-3 rounded-xl font-semibold transition ${points >= selectedReward.pointsCost && !redeeming ? "bg-yellow-400 text-black hover:brightness-110" : "bg-slate-200 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-400 cursor-not-allowed"}`}
              >
                {redeeming ? "Redeeming…" : "Redeem"}
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
