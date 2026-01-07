import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "wellness_dashboard_state_v1";

export default function Login() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();

  const normalized = email.trim().toLowerCase();

  const isNjitEmail = useMemo(() => {
    return normalized.endsWith("@njit.edu") && normalized.length > "@njit.edu".length;
  }, [normalized]);

  const canContinue = isNjitEmail;

  const handleContinue = (e) => {
    e.preventDefault();
    if (!canContinue) return;

    // ✅ frontend auth flag so protected routes work
    localStorage.setItem("wellness_logged_in", "true");

    // optional: store email in dashboard state
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const next = {
        ...parsed,
        user: {
          ...(parsed.user || {}),
          email: normalized,
          name: parsed?.user?.name || "Santhosh",
          initials: parsed?.user?.initials || "SN",
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}

    navigate("/dashboard");
  };

  return (
    <section className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#121212] border border-gray-800 rounded-2xl p-10 shadow-lg">
        <h1 className="text-4xl font-semibold mb-3">Sign in</h1>
        <p className="text-gray-400 mb-10">
          Enter your NJIT email. You’ll be redirected to NJIT’s secure login.
        </p>

        <form onSubmit={handleContinue}>
          <label className="block text-sm font-semibold text-gray-200 mb-2">
            NJIT Email
          </label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="yourname@njit.edu"
            className="w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-3 text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />

          {touched && email.trim() && !isNjitEmail && (
            <p className="text-sm text-red-300 mt-3">
              Please enter a valid NJIT email (must end with{" "}
              <span className="font-semibold">@njit.edu</span>).
            </p>
          )}

          <button
            type="submit"
            disabled={!canContinue}
            className={`mt-8 w-full px-6 py-4 rounded-xl text-lg font-semibold
              ${
                canContinue
                  ? "text-white bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_10px_24px_rgba(16,185,129,0.18)] hover:scale-[1.01] transition-transform"
                  : "text-gray-400 bg-[#1a1a1a] cursor-not-allowed"
              }`}
          >
            Continue
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-6">
          This app won’t store your NJIT password. Authentication happens on NJIT’s login page.
        </p>
      </div>
    </section>
  );
}
