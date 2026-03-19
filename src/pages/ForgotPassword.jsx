import { useState } from "react";
import { Link } from "react-router-dom";
import { auth as authApi } from "../lib/api.js";

const INPUT_CLS = "w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [devUrl, setDevUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normal = email.trim().toLowerCase();
    if (!normal.endsWith("@njit.edu")) {
      setError("Please enter a valid NJIT email address (@njit.edu).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(normal);
      setSubmitted(true);
      if (result?.devUrl) setDevUrl(result.devUrl);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#121212] border border-gray-800 rounded-2xl p-10 shadow-lg">
        {submitted ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-3">Check your inbox</h1>
            <p className="text-gray-400 text-sm mb-6">
              If an account exists for <span className="text-gray-200 font-medium">{email.trim().toLowerCase()}</span>, you'll receive a password reset link shortly. The link expires in 1 hour.
            </p>
            {devUrl && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3 mb-6">
                <p className="text-yellow-400 text-xs font-semibold mb-1">Dev mode — SMTP not configured</p>
                <a href={devUrl} className="text-blue-400 text-xs break-all underline">{devUrl}</a>
              </div>
            )}
            <Link to="/login" className="block text-center text-sm text-emerald-400 hover:underline font-medium">
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold mb-3">Forgot password?</h1>
            <p className="text-gray-400 text-sm mb-8">
              Enter your NJIT email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">NJIT Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@njit.edu"
                  className={INPUT_CLS}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full px-6 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_10px_24px_rgba(16,185,129,0.18)] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-6 text-center">
              Remember it?{" "}
              <Link to="/login" className="text-emerald-400 hover:underline font-medium">Back to Sign In</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
