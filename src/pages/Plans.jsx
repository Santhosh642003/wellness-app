import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import Toast from "../components/Toast";

const STORAGE_KEY = "wellness_dashboard_state_v1";

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StarIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function getCurrentPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "free";
    const parsed = JSON.parse(raw);
    return parsed?.user?.plan || "free";
  } catch {
    return "free";
  }
}

export default function Plans() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const currentPlan = getCurrentPlan();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleUpgrade = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const updated = {
        ...parsed,
        user: { ...(parsed.user || {}), plan: "plus" },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast("Plus Plan activated!");
      setTimeout(() => navigate("/profile"), 1200);
    } catch {
      showToast("Something went wrong. Please try again.");
    }
  };

  const handleDowngrade = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const updated = {
        ...parsed,
        user: { ...(parsed.user || {}), plan: "free" },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast("Switched to Free plan");
      setTimeout(() => navigate("/profile"), 1200);
    } catch {
      showToast("Something went wrong. Please try again.");
    }
  };

  const freePlan = {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Start your wellness journey",
    features: [
      "Access to 4 core modules",
      "+5 points daily login reward",
      "Module & bi-weekly quizzes",
      "Rewards store access",
      "Basic progress tracking",
    ],
    missing: [
      "Bonus modules (Myths vs Facts, Campus Resources)",
      "2x daily points",
      "Live captions on videos",
      "Priority reward redemptions",
    ],
  };

  const plusPlan = {
    name: "Plus",
    price: "$0",
    period: "NJIT students — always free",
    description: "Get the full wellness experience",
    features: [
      "All 6 learning modules unlocked",
      "+10 points daily login reward (2x)",
      "Module & bi-weekly quizzes",
      "Rewards store access",
      "Advanced progress tracking",
      "Live captions on all videos",
      "Priority reward redemptions",
      "Exclusive bonus module content",
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 mb-6">
            <StarIcon className="w-3.5 h-3.5" />
            Wellness Plans
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Choose your plan
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Both plans are free for NJIT students. Plus gives you access to
            every feature we offer — no strings attached.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Free Plan */}
          <div className={`bg-[#121212] border rounded-3xl p-8 flex flex-col ${
            currentPlan === "free" ? "border-gray-600" : "border-gray-800"
          }`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xl font-bold">{freePlan.name}</div>
                <div className="text-gray-500 text-sm mt-1">{freePlan.description}</div>
              </div>
              {currentPlan === "free" && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-700/50 border border-gray-600 text-gray-300">
                  Current
                </span>
              )}
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">{freePlan.price}</span>
              <span className="text-gray-500 text-sm ml-2">{freePlan.period}</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {freePlan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckIcon />
                  {f}
                </li>
              ))}
              {freePlan.missing.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {currentPlan === "free" ? (
              <button disabled className="w-full px-6 py-3 rounded-2xl font-semibold bg-[#1a1a1a] text-gray-500 border border-gray-800 cursor-not-allowed">
                Current plan
              </button>
            ) : (
              <button
                onClick={handleDowngrade}
                className="w-full px-6 py-3 rounded-2xl font-semibold bg-[#1a1a1a] border border-gray-800 hover:bg-[#1f1f1f] text-gray-300 transition"
              >
                Switch to Free
              </button>
            )}
          </div>

          {/* Plus Plan */}
          <div className={`relative rounded-3xl p-8 flex flex-col border ${
            currentPlan === "plus"
              ? "bg-gradient-to-br from-yellow-400/8 to-orange-400/5 border-yellow-400/25"
              : "bg-gradient-to-br from-yellow-400/5 to-orange-400/3 border-yellow-400/15"
          }`}>
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900">
                <StarIcon className="w-3 h-3" />
                Recommended
              </span>
            </div>

            <div className="flex items-start justify-between mb-6 mt-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold">{plusPlan.name}</div>
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-gray-400 text-sm mt-1">{plusPlan.description}</div>
              </div>
              {currentPlan === "plus" && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/25 text-yellow-300">
                  Active
                </span>
              )}
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-yellow-300">{plusPlan.price}</span>
              <span className="text-gray-500 text-sm ml-2">{plusPlan.period}</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plusPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-200">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            {currentPlan === "plus" ? (
              <button disabled className="w-full px-6 py-3 rounded-2xl font-semibold bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 cursor-not-allowed">
                Current plan — Active
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                className="w-full px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 hover:opacity-90 transition"
              >
                Activate Plus — Free
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Is the Plus plan really free?",
                a: "Yes! Wellness Plus is completely free for all registered NJIT students. We believe every student deserves access to the full experience.",
              },
              {
                q: "What are live captions?",
                a: "Live captions display real-time text synchronized with each video as it plays. They're great for studying in noisy environments or if you prefer reading along.",
              },
              {
                q: "What bonus modules are in Plus?",
                a: "Plus unlocks two bonus modules: 'Vaccine Myths vs Facts' and 'Campus Wellness Resources'. These cover critical misinformation and all the health services available to you at NJIT.",
              },
              {
                q: "Can I switch between plans?",
                a: "Yes, you can switch freely at any time. Your progress and points are always saved.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-[#121212] border border-gray-800 rounded-2xl p-5">
                <div className="font-semibold text-sm mb-2">{q}</div>
                <div className="text-gray-400 text-sm leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
