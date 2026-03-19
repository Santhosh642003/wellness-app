import { useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { auth as authApi } from "../lib/api.js";

const SPECIAL_CHAR_RE = /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/;

function passwordStrength(p) {
  return [p.length >= 8, /[A-Z]/.test(p), /[a-z]/.test(p), /[0-9]/.test(p), SPECIAL_CHAR_RE.test(p)].filter(Boolean).length;
}

function PasswordStrengthBar({ password }) {
  const strength = passwordStrength(password);
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? colors[strength - 1] : "bg-gray-700"}`} />
        ))}
      </div>
      <p className={`text-xs ${strength <= 2 ? "text-red-400" : strength <= 3 ? "text-yellow-400" : "text-emerald-400"}`}>
        {labels[strength - 1] || "Too weak"}
        {strength < 5 && (
          <span className="text-gray-500 ml-1">
            — needs:{" "}
            {[!/[A-Z]/.test(password) && "uppercase", !/[a-z]/.test(password) && "lowercase", !/[0-9]/.test(password) && "number", !SPECIAL_CHAR_RE.test(password) && "special char", password.length < 8 && "8+ chars"].filter(Boolean).join(", ")}
          </span>
        )}
      </p>
    </div>
  );
}

const INPUT_CLS = "w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(password);
  const passwordValid = strength === 5;
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordValid) { setError("Your password does not meet the requirements."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    if (!token) { setError("Invalid or missing reset token. Please request a new reset link."); return; }
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <section className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#121212] border border-gray-800 rounded-2xl p-10 shadow-lg text-center">
          <p className="text-red-400 mb-6">No reset token found. Please request a new password reset link.</p>
          <Link to="/forgot-password" className="text-emerald-400 hover:underline font-medium">Request Reset Link</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#121212] border border-gray-800 rounded-2xl p-10 shadow-lg">
        {success ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-3">Password updated!</h1>
            <p className="text-gray-400 text-sm mb-6">Your password has been changed successfully. Redirecting you to sign in…</p>
            <Link to="/login" className="block text-center text-sm text-emerald-400 hover:underline font-medium">Go to Sign In</Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold mb-3">New password</h1>
            <p className="text-gray-400 text-sm mb-8">Choose a strong password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className={INPUT_CLS}
                  autoFocus
                />
                <PasswordStrengthBar password={password} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={INPUT_CLS}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                )}
                {confirmPassword && passwordsMatch && password && (
                  <p className="text-xs text-emerald-400 mt-1">Passwords match.</p>
                )}
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !passwordValid || !passwordsMatch || !password || !confirmPassword}
                className="w-full px-6 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_10px_24px_rgba(16,185,129,0.18)] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Set New Password"}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-6 text-center">
              <Link to="/login" className="text-emerald-400 hover:underline font-medium">Back to Sign In</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
