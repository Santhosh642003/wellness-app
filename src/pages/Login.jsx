import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext.jsx";
import { auth as authApi } from "../lib/api.js";

const CAMPUSES = ["NJIT Newark", "NJIT Jersey City", "Other"];
const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Doctoral", "Other"];
const MAJORS = [
  "Computer Science", "Information Technology", "Computer Engineering",
  "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
  "Biomedical Engineering", "Architecture", "Mathematics", "Physics",
  "Chemistry", "Biology", "Business", "Finance", "Data Science", "Other",
];
const ETHNICITIES = [
  "Asian / Pacific Islander", "Black / African American", "Hispanic / Latino",
  "Middle Eastern / North African", "Native American / Alaskan Native",
  "White / Caucasian", "Two or more races", "Prefer not to say",
];

const SPECIAL_CHAR_RE = /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/;

function passwordStrength(p) {
  const checks = [p.length >= 8, /[A-Z]/.test(p), /[a-z]/.test(p), /[0-9]/.test(p), SPECIAL_CHAR_RE.test(p)];
  return checks.filter(Boolean).length;
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
const SELECT_CLS = INPUT_CLS + " appearance-none";
const LABEL_CLS = "block text-sm font-semibold text-gray-200 mb-2";

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState(1); // register steps: 1=personal, 2=credentials, 3=otp

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register step 1 – personal info
  const [name, setName] = useState("");
  const [campus, setCampus] = useState(CAMPUSES[0]);
  const [major, setMajor] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [ethnicity, setEthnicity] = useState("");

  // Register step 2 – credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Register step 3 – OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState(""); // shown only in dev when SMTP not configured

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalEmail = email.trim().toLowerCase();
  const isNjitEmail = useMemo(
    () => normalEmail.endsWith("@njit.edu") && normalEmail.length > "@njit.edu".length,
    [normalEmail]
  );

  const pwStrength = passwordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const passwordValid = pwStrength === 5;

  const resetRegister = () => {
    setStep(1); setName(""); setCampus(CAMPUSES[0]); setMajor(""); setYearOfStudy(""); setEthnicity("");
    setEmail(""); setPassword(""); setConfirmPassword(""); setOtpCode(""); setOtpSent(false); setDevCode(""); setError("");
  };

  // --- Login handler ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 1 → 2 ---
  const goToStep2 = (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError("Please enter your full name (at least 2 characters)."); return; }
    setError("");
    setStep(2);
  };

  // --- Step 2: Send OTP → Step 3 ---
  const sendOtp = async (e) => {
    e.preventDefault();
    if (!isNjitEmail) { setError("Please enter a valid NJIT email address."); return; }
    if (!passwordValid) { setError("Your password does not meet the requirements."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await authApi.sendOtp({ email: normalEmail });
      setOtpSent(true);
      if (result.devCode) setDevCode(result.devCode);
      setStep(3);
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Complete registration ---
  const handleRegister = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) { setError("Please enter the 6-digit verification code."); return; }
    setError("");
    setLoading(true);
    try {
      await register({
        email: normalEmail, password, name: name.trim(),
        campus, major: major || undefined, yearOfStudy: yearOfStudy || undefined,
        ethnicity: ethnicity || undefined, otpCode,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please check your code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => { setMode("login"); resetRegister(); setLoginEmail(""); setLoginPassword(""); setError(""); };
  const switchToRegister = () => { setMode("register"); setStep(1); setError(""); };

  return (
    <section className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#121212] border border-gray-800 rounded-2xl p-10 shadow-lg">

        {/* ── LOGIN ── */}
        {mode === "login" && (
          <>
            <h1 className="text-4xl font-semibold mb-3">Sign in</h1>
            <p className="text-gray-400 mb-10">Sign in with your NJIT credentials to continue.</p>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={LABEL_CLS}>NJIT Email</label>
                <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" placeholder="yourname@njit.edu" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Password</label>
                <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type="password" placeholder="Your password" className={INPUT_CLS} />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading || !loginEmail || !loginPassword}
                className="mt-2 w-full px-6 py-4 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_10px_24px_rgba(16,185,129,0.18)] hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-8 text-center">
              Don&apos;t have an account?{" "}
              <button onClick={switchToRegister} className="text-emerald-400 hover:underline font-medium">Register</button>
            </p>
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
                      setLoading(true); setError("");
                      try { await loginWithGoogle(credential); navigate("/dashboard"); }
                      catch (err) { setError(err.message || "Google sign-in failed. Ensure you use an @njit.edu account."); }
                      finally { setLoading(false); }
                    }}
                    onError={() => setError("Google sign-in was cancelled or failed.")}
                    theme="filled_black" shape="rectangular" text="signin_with"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-3 text-center">Only @njit.edu Google accounts are accepted.</p>
              </div>
            )}
          </>
        )}

        {/* ── REGISTER ── */}
        {mode === "register" && (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step === s ? "border-emerald-400 bg-emerald-400 text-black" : step > s ? "border-emerald-600 bg-emerald-600/20 text-emerald-400" : "border-gray-700 text-gray-600"}`}>
                    {step > s ? "✓" : s}
                  </div>
                  {s < 3 && <div className={`h-px w-8 ${step > s ? "bg-emerald-600" : "bg-gray-800"}`} />}
                </div>
              ))}
              <span className="ml-2 text-xs text-gray-500">
                {step === 1 ? "Personal info" : step === 2 ? "Account setup" : "Verify email"}
              </span>
            </div>

            {/* STEP 1 – Personal Info */}
            {step === 1 && (
              <>
                <h1 className="text-3xl font-semibold mb-2">About you</h1>
                <p className="text-gray-400 mb-8">Tell us a bit about yourself to get started.</p>
                <form onSubmit={goToStep2} className="space-y-5">
                  <div>
                    <label className={LABEL_CLS}>Full Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Campus</label>
                    <select value={campus} onChange={(e) => setCampus(e.target.value)} className={SELECT_CLS}>
                      {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Major</label>
                    <select value={major} onChange={(e) => setMajor(e.target.value)} className={SELECT_CLS}>
                      <option value="">Select your major</option>
                      {MAJORS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Year of Study</label>
                    <select value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} className={SELECT_CLS}>
                      <option value="">Select year</option>
                      {YEARS.map((y) => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Ethnicity</label>
                    <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className={SELECT_CLS}>
                      <option value="">Prefer not to say</option>
                      {ETHNICITIES.map((et) => <option key={et}>{et}</option>)}
                    </select>
                  </div>
                  {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">{error}</p>}
                  <button type="submit" className="mt-2 w-full px-6 py-4 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-emerald-400 hover:scale-[1.01] transition-transform">
                    Continue
                  </button>
                </form>
              </>
            )}

            {/* STEP 2 – Email + Password */}
            {step === 2 && (
              <>
                <h1 className="text-3xl font-semibold mb-2">Account setup</h1>
                <p className="text-gray-400 mb-8">Use your official NJIT email. We&apos;ll send a verification code.</p>
                <form onSubmit={sendOtp} className="space-y-5">
                  <div>
                    <label className={LABEL_CLS}>NJIT Email *</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="yourname@njit.edu" className={INPUT_CLS} />
                    {email && !isNjitEmail && (
                      <p className="text-sm text-red-300 mt-2">Must be an <span className="font-semibold">@njit.edu</span> address.</p>
                    )}
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Password *</label>
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min 8 chars, uppercase, number, special char" className={INPUT_CLS} />
                    <PasswordStrengthBar password={password} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Confirm Password *</label>
                    <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Repeat your password" className={INPUT_CLS} />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-sm text-red-300 mt-2">Passwords do not match.</p>
                    )}
                    {confirmPassword && passwordsMatch && password && (
                      <p className="text-sm text-emerald-400 mt-2">✓ Passwords match</p>
                    )}
                  </div>
                  {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">{error}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setStep(1); setError(""); }} className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm">
                      Back
                    </button>
                    <button type="submit" disabled={loading || !isNjitEmail || !passwordValid || !passwordsMatch}
                      className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-emerald-400 hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                      {loading ? "Sending code…" : "Send Verification Code"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* STEP 3 – OTP Verification */}
            {step === 3 && (
              <>
                <h1 className="text-3xl font-semibold mb-2">Verify your email</h1>
                <p className="text-gray-400 mb-2">We sent a 6-digit code to <span className="text-white font-medium">{normalEmail}</span>.</p>
                <p className="text-gray-500 text-sm mb-8">The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.</p>
                {devCode && (
                  <div className="mb-6 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3">
                    <p className="text-yellow-400 text-xs font-semibold mb-1">DEV MODE — SMTP not configured</p>
                    <p className="text-yellow-300 text-sm">Your code: <span className="font-mono font-bold text-xl tracking-widest">{devCode}</span></p>
                  </div>
                )}
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className={LABEL_CLS}>Verification Code</label>
                    <input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      className="w-full rounded-xl bg-[#0f0f0f] border border-gray-800 px-4 py-4 text-gray-100 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">{error}</p>}
                  <button type="submit" disabled={loading || otpCode.length !== 6}
                    className="w-full px-6 py-4 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-emerald-400 hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    {loading ? "Creating account…" : "Create Account"}
                  </button>
                  <button type="button" onClick={() => { setStep(2); setOtpCode(""); setDevCode(""); setError(""); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 py-2">
                    ← Back / Resend code
                  </button>
                </form>
              </>
            )}

            <p className="text-sm text-gray-500 mt-8 text-center">
              Already have an account?{" "}
              <button onClick={switchToLogin} className="text-emerald-400 hover:underline font-medium">Sign in</button>
            </p>

            {step === 1 && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-gray-600">or register with Google</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={async ({ credential }) => {
                      setLoading(true); setError("");
                      try { await loginWithGoogle(credential); navigate("/dashboard"); }
                      catch (err) { setError(err.message || "Google sign-in failed. Ensure you use an @njit.edu account."); }
                      finally { setLoading(false); }
                    }}
                    onError={() => setError("Google sign-in was cancelled or failed.")}
                    theme="filled_black" shape="rectangular" text="signup_with"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-3 text-center">Only @njit.edu Google accounts are accepted.</p>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-600 mt-6">Your password is securely hashed and never stored in plain text.</p>
      </div>
    </section>
  );
}
