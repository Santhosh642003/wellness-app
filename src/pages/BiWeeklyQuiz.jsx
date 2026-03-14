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
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("wellness_token");
    fetch("/api/modules/quiz/biweekly", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setQuestions(
          (data.questions || []).map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
            chosen: null,
          }))
        );
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
    <div style={pageStyle} className="items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  if (!questions) return (
    <div style={pageStyle} className="items-center justify-center">
      <p className="text-[var(--text-muted)] animate-pulse">Loading quiz…</p>
    </div>
  );

  return (
    <div style={pageStyle}>
      <DashboardNav initials={user?.initials || "SN"} />
      <div className="flex-1">
        <QuizEngine
          title="Bi-Weekly Competition"
          subtitle="Your chance to earn bonus points!"
          questions={questions}
          onFinish={onFinish}
        />
      </div>
      <Footer />
    </div>
  );
}
