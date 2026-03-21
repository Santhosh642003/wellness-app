import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import QuizEngine from "../components/QuizEngine";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi, users as usersApi } from "../lib/api";

export default function ModuleQuiz() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [questions, setQuestions] = useState(null);
  const [mod, setMod] = useState(null);
  const [allModules, setAllModules] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // {passed, score, total, pointsEarned}

  useEffect(() => {
    const token = localStorage.getItem("wellness_token");
    Promise.all([
      fetch(`/api/modules/${moduleId}/quiz`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json()),
      modulesApi.list(),
    ])
      .then(([quizData, all]) => {
        if (quizData.error) throw new Error(quizData.error);
        setQuestions(
          (quizData.questions || []).map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
            chosen: null,
          }))
        );
        const current = all.find((m) => m.id === moduleId);
        setMod(current || null);
        setAllModules(all);
      })
      .catch((err) => setError(err.message));
  }, [moduleId]);

  const onFinish = async (engineResult) => {
    let pointsEarned = 0;
    if (user?.id) {
      try {
        const res = await usersApi.submitQuiz(user.id, {
          moduleId,
          quizType: "module",
          score: engineResult.score,
          totalPoints: engineResult.total,
          answers: engineResult.answers,
        });
        pointsEarned = res.pointsEarned || 0;
      } catch (err) {
        console.error("Failed to submit quiz", err);
      }
    }
    const passed = engineResult.total > 0 && engineResult.score / engineResult.total >= 0.7;
    setResult({ passed, score: engineResult.score, total: engineResult.total, pointsEarned });
  };

  const currentIdx = allModules.findIndex((m) => m.id === moduleId);
  const nextModule = allModules[currentIdx + 1] || null;

  const pageStyle = { background: "var(--bg-page)", minHeight: "100vh", display: "flex", flexDirection: "column" };

  if (error) {
    return (
      <div style={pageStyle} className="items-center justify-center">
        <DashboardNav initials={user?.initials || "?"} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => navigate(`/modules/${moduleId}`)} className="text-sm text-blue-500 hover:underline">
              ← Back to Module
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!questions) {
    return (
      <div style={pageStyle} className="items-center justify-center">
        <p className="text-[var(--text-muted)] animate-pulse">Loading quiz…</p>
      </div>
    );
  }

  // ── Results screen ───────────────────────────────────────────────────────
  if (result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div style={pageStyle}>
        <DashboardNav initials={user?.initials || "?"} />
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Pass / fail icon */}
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
              result.passed ? "bg-emerald-100 dark:bg-emerald-500/10" : "bg-red-100 dark:bg-red-500/10"
            }`}>
              {result.passed ? (
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {result.passed ? "Module Complete!" : "Not quite there"}
              </h1>
              <p className="text-slate-500 dark:text-gray-400 text-sm">
                {result.passed
                  ? "You passed the quiz and completed this module."
                  : "You need 70% or more to pass. Review the module and try again."}
              </p>
            </div>

            {/* Score card */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-500">Score</span>
                <span className={`font-bold text-lg ${result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.passed ? "bg-gradient-to-r from-blue-500 to-emerald-400" : "bg-red-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-600">
                <span>Passing: 70%</span>
                <span>{result.score} / {result.total} pts</span>
              </div>
              {result.passed && result.pointsEarned > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100 dark:border-gray-800">
                  <span className="text-slate-500 dark:text-gray-500">Points earned</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-300">+{result.pointsEarned} pts</span>
                </div>
              )}
              {result.passed && mod?.pointsValue && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-gray-500">Module completion</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-300">+{mod.pointsValue} pts</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {result.passed ? (
                <>
                  {nextModule && !nextModule.locked && (
                    <button
                      onClick={() => navigate(`/modules/${nextModule.id}`)}
                      className="w-full px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition"
                    >
                      Continue to Next Module →
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/modules")}
                    className="w-full px-6 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#1f1f1f]"
                  >
                    Back to All Modules
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setResult(null)}
                    className="w-full px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate(`/modules/${moduleId}`)}
                    className="w-full px-6 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#1f1f1f]"
                  >
                    Back to Module
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <DashboardNav initials={user?.initials || "?"} />
      <div className="flex-1">
        <QuizEngine
          title={mod ? `${mod.title} — Quiz` : "Module Quiz"}
          subtitle="Score 70% or higher to complete this module and unlock the next one."
          questions={questions}
          onFinish={onFinish}
        />
      </div>
      <Footer />
    </div>
  );
}
