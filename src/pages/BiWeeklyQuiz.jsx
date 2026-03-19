import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import QuizEngine from "../components/QuizEngine";
import { useAuth } from "../contexts/AuthContext";
import { users as usersApi } from "../lib/api";

export default function BiWeeklyQuiz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(null); // { nextAvailable, score, totalPoints, passed }
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("wellness_token");
    fetch("/api/modules/quiz/biweekly", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data.alreadyAttempted) {
          setAlreadyAttempted({ nextAvailable: data.nextAvailable, score: data.score, totalPoints: data.totalPoints, passed: data.passed });
        } else {
          setQuestions(
            (data.questions || []).map((q) => ({
              ...q,
              options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
              chosen: null,
            }))
          );
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const onFinish = async (result) => {
    if (user?.id) {
      try {
        await usersApi.submitQuiz(user.id, {
          quizType: "biweekly",
          score: result.score,
          totalPoints: result.total,
          answers: result.answers,
        });
      } catch (err) {
        console.error("Failed to submit quiz", err);
      }
    }
    navigate("/dashboard");
  };

  const pageStyle = { background: "var(--bg-page)", minHeight: "100vh", display: "flex", flexDirection: "column" };

  if (error) return (
    <div style={pageStyle} className="items-center justify-center flex">
      <DashboardNav initials={user?.initials || "SN"} />
      <p className="text-red-500 mt-20 text-center">{error}</p>
    </div>
  );

  if (!questions && !alreadyAttempted) return (
    <div style={pageStyle} className="items-center justify-center flex">
      <p className="text-[var(--text-muted)] animate-pulse">Loading quiz…</p>
    </div>
  );

  if (alreadyAttempted) {
    const next = new Date(alreadyAttempted.nextAvailable);
    const pct = alreadyAttempted.totalPoints > 0
      ? Math.round((alreadyAttempted.score / alreadyAttempted.totalPoints) * 100)
      : 0;
    return (
      <div style={pageStyle}>
        <DashboardNav initials={user?.initials || "SN"} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 flex items-center justify-center mx-auto mb-6 text-4xl">
              {alreadyAttempted.passed ? "🏆" : "📋"}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
              {alreadyAttempted.passed ? "Quiz Completed!" : "Quiz Attempted"}
            </h1>
            <p className="text-slate-500 dark:text-gray-400 mb-6">
              You scored <strong className="text-slate-900 dark:text-white">{pct}%</strong> on this period's bi-weekly competition.
              {alreadyAttempted.passed ? " Great work!" : " Keep studying and try again next period."}
            </p>
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 mb-6">
              <div className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-1">Next quiz available</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {next.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="text-sm text-slate-400 dark:text-gray-500">
                {Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24))} days from now
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <DashboardNav initials={user?.initials || "SN"} />
      <div className="flex-1">
        <QuizEngine
          title="Bi-Weekly Competition"
          subtitle="Your chance to earn bonus points — one attempt per two weeks!"
          questions={questions}
          onFinish={onFinish}
        />
      </div>
      <Footer />
    </div>
  );
}
