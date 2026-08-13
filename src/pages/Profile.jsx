import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import Toast from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { users as usersApi } from "../lib/api";

function SectionCard({ children, accent }) {
  const bars = {
    blue:    "from-blue-500 to-blue-400",
    violet:  "from-violet-500 to-violet-400",
    amber:   "from-amber-500 to-amber-400",
    emerald: "from-emerald-500 to-emerald-400",
    yellow:  "from-yellow-400 to-amber-400",
    rose:    "from-rose-500 to-pink-400",
  };
  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      {accent && <div className={`h-0.5 w-full bg-gradient-to-r ${bars[accent] || bars.blue}`} />}
      <div className="p-6">{children}</div>
    </div>
  );
}

function ProfileCompletionBar({ profileData, onEdit }) {
  const fields = [
    { key: "major", label: "Major" },
    { key: "graduationYear", label: "Graduation Year" },
    { key: "bio", label: "Bio" },
    { key: "campus", label: "Campus" },
  ];
  const filled = fields.filter(({ key, check }) =>
    check ? check(profileData?.[key]) : !!profileData?.[key]
  ).length;
  const pct = Math.round((filled / fields.length) * 100);
  const missing = fields
    .filter(({ key, check }) => !(check ? check(profileData?.[key]) : !!profileData?.[key]))
    .map(({ label }) => label);

  if (pct === 100) {
    return (
      <div className="mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Profile complete!</div>
          <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">All profile fields are filled in</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Complete your profile</span>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
        className="h-2.5 rounded-full bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden"
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      {missing.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {missing.map((label) => (
            <button
              key={label}
              onClick={onEdit}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:border-blue-400/40 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              + {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const INPUT_CLS = "w-full rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30";
const LABEL_CLS = "block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [toast, setToast] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [referralsList, setReferralsList] = useState([]);
  const fileInputRef = useRef(null);

  const avatarUrl = profileData?.avatarUrl || user?.avatarUrl || null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [data, refs] = await Promise.all([
        usersApi.get(user.id),
        usersApi.referrals(user.id).catch(() => []),
      ]);
      setProfileData(data);
      setReferralsList(refs || []);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setToast("Image is too large — please choose a file under 5 MB"); return; }
    setUploading(true);
    try {
      const updated = await usersApi.uploadAvatar(user.id, file);
      setProfileData((prev) => ({ ...prev, avatarUrl: updated.avatarUrl }));
      await refreshUser();
      setToast("Profile photo updated!");
    } catch (err) {
      setToast(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const progress = profileData?.progress || {};
  const moduleProgresses = profileData?.moduleProgresses || [];
  const redemptions = profileData?.redemptions || [];

  const completedCount = moduleProgresses.filter((m) => m.completed).length;
  const totalModules = moduleProgresses.length;

  const overallPct = useMemo(() => {
    if (!totalModules) return 0;
    const sum = moduleProgresses.reduce((acc, m) => acc + (m.watchedPercent || 0), 0);
    return Math.round(sum / totalModules);
  }, [moduleProgresses, totalModules]);

  const nextModule = moduleProgresses.find((m) => !m.locked && !m.completed);

  const startEdit = () => {
    setForm({
      name: profileData?.name || "",
      role: profileData?.role || "Student",
      campus: profileData?.campus || "",
      major: profileData?.major || "",
      graduationYear: profileData?.graduationYear || "",
      bio: profileData?.bio || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile(user.id, form);
      setProfileData((prev) => ({ ...prev, ...updated }));
      setEditing(false);
      setToast("Profile saved!");
    } catch (err) {
      setToast(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-[var(--text-muted)] animate-pulse">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav
        points={progress.points || 0}
        streakDays={progress.streakDays || 0}
        initials={user?.initials || "?"}
        avatarUrl={avatarUrl}
      />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {/* Profile completion */}
        <ProfileCompletionBar profileData={profileData} onEdit={startEdit} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-6">

            {/* Hero card */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-emerald-400" />
              <div className="p-6">
                {!editing ? (
                  <div className="flex items-start justify-between gap-6 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-5">
                      {/* Avatar with upload */}
                      <div className="relative shrink-0">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-400/20 border border-slate-200 dark:border-gray-700 overflow-hidden flex items-center justify-center text-2xl font-semibold text-slate-900 dark:text-white">
                          {avatarUrl
                            ? <img src={avatarUrl} alt={profileData?.name || "Avatar"} className="h-full w-full object-cover" />
                            : (user?.initials || "?")}
                        </div>
                        <label
                          htmlFor="avatar-input"
                          title="Change photo"
                          className={`absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-blue-500 border-2 border-white dark:border-[#121212] flex items-center justify-center cursor-pointer hover:bg-blue-600 transition ${uploading ? "pointer-events-none" : ""}`}
                        >
                          {uploading
                            ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Camera size={12} className="text-white" />}
                        </label>
                        <input
                          ref={fileInputRef}
                          id="avatar-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </div>

                      {/* Identity */}
                      <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white leading-tight">
                          {profileData?.name || user?.name || "Student"}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                            {profileData?.role || "Student"}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-gray-500">{user?.email}</span>
                        </div>
                        <div className="text-xs text-slate-400 dark:text-gray-500 mt-1.5">
                          {profileData?.campus || "NJIT"}
                          {profileData?.major && ` · ${profileData.major}`}
                          {profileData?.graduationYear && ` · Class of ${profileData.graduationYear}`}
                        </div>
                        {profileData?.bio && (
                          <p className="text-sm text-slate-600 dark:text-gray-400 mt-3 leading-relaxed max-w-md">
                            {profileData.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 shrink-0 mt-1">
                      <button
                        onClick={startEdit}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#1f1f1f] transition"
                      >
                        Edit profile
                      </button>
                      <button
                        onClick={signOut}
                        className="px-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 transition"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-5">Edit Profile</h2>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="profile-name" className={LABEL_CLS}>Full Name</label>
                        <input
                          id="profile-name"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="profile-role" className={LABEL_CLS}>Role</label>
                          <select
                            id="profile-role"
                            value={form.role}
                            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                            className={INPUT_CLS}
                          >
                            {["Student", "Faculty", "Staff"].map((r) => <option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="profile-campus" className={LABEL_CLS}>Campus</label>
                          <select
                            id="profile-campus"
                            value={form.campus}
                            onChange={(e) => setForm((f) => ({ ...f, campus: e.target.value }))}
                            className={INPUT_CLS}
                          >
                            <option value="">Select campus…</option>
                            <option value="Newark">Newark (Main Campus)</option>
                            <option value="Jersey City">Jersey City</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="profile-major" className={LABEL_CLS}>Major</label>
                          <input
                            id="profile-major"
                            value={form.major}
                            onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                            placeholder="e.g. Computer Science"
                            className={INPUT_CLS}
                          />
                        </div>
                        <div>
                          <label htmlFor="profile-year" className={LABEL_CLS}>Graduation Year</label>
                          <input
                            id="profile-year"
                            value={form.graduationYear}
                            onChange={(e) => setForm((f) => ({ ...f, graduationYear: e.target.value }))}
                            placeholder="e.g. 2026"
                            className={INPUT_CLS}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="profile-bio" className={LABEL_CLS}>
                          Bio <span className="font-normal text-slate-400">({(form.bio || "").length}/500)</span>
                        </label>
                        <textarea
                          id="profile-bio"
                          value={form.bio}
                          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 500) }))}
                          rows={3}
                          placeholder="Tell us a little about yourself…"
                          className={`${INPUT_CLS} resize-none`}
                        />
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#141414] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Learning Progress */}
            <SectionCard accent="blue">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Learning Progress</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                  {overallPct}% overall
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={overallPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Learning progress"
                className="h-2 rounded-full bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{completedCount}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mt-1">Completed</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalModules}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mt-1">Total</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-2">Next up</div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-gray-200 leading-snug line-clamp-2">
                    {nextModule ? nextModule.title : "All done!"}
                  </div>
                  {nextModule && (
                    <button
                      onClick={() => navigate(`/modules/${nextModule.moduleId}`)}
                      className="mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 transition"
                    >
                      Continue
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Module History */}
            {moduleProgresses.length > 0 && (
              <SectionCard>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Module History</h2>
                  <button onClick={() => navigate("/modules")} className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition">
                    View all →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {moduleProgresses.map((m) => (
                    <div key={m.moduleId} className="flex items-center gap-3 py-1">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${m.completed ? "bg-emerald-400" : m.locked ? "bg-slate-300 dark:bg-gray-700" : "bg-blue-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 dark:text-gray-300 truncate">{m.title}</div>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-gray-600 shrink-0">
                        {m.completed
                          ? <span className="text-emerald-500">✓ Done</span>
                          : m.locked
                          ? "Locked"
                          : `${m.watchedPercent}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Quizzes */}
            <SectionCard accent="violet">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Quizzes</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mb-5">Bi-weekly and module quizzes to earn points</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Bi-weekly Quiz</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 mb-4">~20 questions · Earn bonus points</div>
                  <button
                    onClick={() => navigate("/quiz/biweekly")}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-violet-400 text-white hover:opacity-90 transition"
                  >
                    Start quiz
                  </button>
                </div>
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Module Quiz</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 mb-4">~10 questions · Unlock next module</div>
                  <button
                    onClick={() => navigate("/modules")}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 transition"
                  >
                    Go to modules
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Redemption History */}
            {redemptions.length > 0 && (
              <SectionCard accent="amber">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Redemption History</h2>
                <div className="space-y-3">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-gray-200">{r.title}</div>
                        <div className="text-xs text-slate-400 dark:text-gray-500">{new Date(r.redeemedAt).toLocaleDateString()}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-500 dark:text-red-400">-{r.pointsSpent} pts</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Referrals */}
            {referralsList.length > 0 && (
              <SectionCard accent="emerald">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Referrals</h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">
                  You earn 100 pts when each invited friend completes 3 modules
                </p>
                <div className="space-y-3">
                  {referralsList.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-gray-200">{r.referredName}</div>
                        <div className="text-xs text-slate-400 dark:text-gray-500">
                          {r.modulesCompleted}/3 modules · joined {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        r.status === "paid"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : r.status === "processing"
                          ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                          : "bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400"
                      }`}>
                        {r.status === "paid" ? "✓ +100 pts paid" : r.status === "processing" ? "Processing…" : `${r.modulesCompleted}/3`}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </section>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Stats */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-orange-400" />
              <div className="p-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Your Stats</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-1">Points</div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-300 leading-none">{(progress.points || 0).toLocaleString()}</div>
                  </div>
                  <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-orange-500 dark:text-orange-400 mb-1">Streak</div>
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-300 leading-none">{progress.streakDays || 0}</div>
                    <div className="text-[10px] text-orange-400/60 mt-1">days</div>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-400 mb-1">Modules</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-300 leading-none">{completedCount}</span>
                    <span className="text-sm text-emerald-400/70 dark:text-emerald-400/50 mb-0.5">/ {totalModules} done</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rewards */}
            <SectionCard accent="amber">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Rewards</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">Earn points from modules, quizzes, and daily streaks</p>
              <button
                onClick={() => navigate("/rewards")}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-400 text-white hover:opacity-90 transition"
              >
                Browse rewards store
              </button>
            </SectionCard>

            {/* Referral Code */}
            {profileData?.referralCode && (
              <SectionCard accent="emerald">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Refer a Friend</h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">
                  Your friend gets <strong className="text-blue-500">+25 pts</strong> on signup, you earn <strong className="text-emerald-500">+100 pts</strong> when they complete 3 modules.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white tracking-wider">
                    {profileData.referralCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profileData.referralCode).catch(() => {});
                      setToast("Referral code copied!");
                    }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-[#141414] text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
                    title="Copy code"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Certificate */}
            <SectionCard accent="yellow">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Certificate</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">
                {completedCount === totalModules && totalModules > 0
                  ? "You've completed all modules! View your certificate."
                  : `Complete all ${totalModules} modules to earn your certificate.`}
              </p>
              <button
                onClick={() => navigate("/certificate")}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition
                  ${completedCount === totalModules && totalModules > 0
                    ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-white hover:opacity-90"
                    : "bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717]"
                  }`}
              >
                {completedCount === totalModules && totalModules > 0 ? "View Certificate ✨" : "View Progress Certificate"}
              </button>
            </SectionCard>
          </aside>
        </div>
      </main>

      <Toast message={toast} />
      <Footer />
    </div>
  );
}
