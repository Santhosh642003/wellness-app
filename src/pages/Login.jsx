import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalized = email.trim().toLowerCase();
  const isNjitEmail = useMemo(
    () => normalized.endsWith("@njit.edu") && normalized.length > "@njit.edu".length,
    [normalized]
  );

  const canSubmit =
    isNjitEmail &&
    password.length >= 8 &&
    (mode === "login" || name.trim().length >= 2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        await register({ email: normalized, password, name: name.trim() });
      } else {
        await login(normalized, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#121212] border border-gray-800 rounded-2xl p-10 shadow-lg">
        <h1 className="text-4xl font-semibold mb-3">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-gray-400 mb-10">
          {mode === "login"
            ? "Sign in with your NJIT credentials to continue."
            : "Register with your NJIT email to get started."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-3 text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              NJIT Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="yourname@njit.edu"
              type="email"
              className="w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-3 text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {touched && email.trim() && !isNjitEmail && (
              <p className="text-sm text-red-300 mt-2">
                Please enter a valid NJIT email (must end with{" "}
                <span className="font-semibold">@njit.edu</span>).
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Min. 8 characters"
              className="w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-3 text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={`mt-2 w-full px-6 py-4 rounded-xl text-lg font-semibold
              ${
                canSubmit && !loading
                  ? "text-white bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_10px_24px_rgba(16,185,129,0.18)] hover:scale-[1.01] transition-transform"
                  : "text-gray-400 bg-[#1a1a1a] cursor-not-allowed"
              }`}
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-8 text-center">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Google Sign-In */}
        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">or continue with Google</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={async ({ credential }) => {
                  setLoading(true);
                  setError("");
                  try {
                    await loginWithGoogle(credential);
                    navigate("/dashboard");
                  } catch (err) {
                    setError(err.message || "Google sign-in failed. Ensure you use an @njit.edu account.");
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={() => setError("Google sign-in was cancelled or failed.")}
                theme="filled_black"
                shape="rectangular"
                text={mode === "register" ? "signup_with" : "signin_with"}
              />
            </div>
            <p className="text-xs text-gray-600 mt-3 text-center">Only @njit.edu Google accounts are accepted.</p>
          </div>
        )}

        <p className="text-xs text-gray-600 mt-4">
          Your password is securely hashed and never stored in plain text.
        </p>
      </div>
    </section>
  );
}
