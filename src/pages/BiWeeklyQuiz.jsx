import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import QuizEngine from "../components/QuizEngine";

export default function BiWeeklyQuiz() {
  const navigate = useNavigate();
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

  const onFinish = (result) => {
    localStorage.setItem("biweekly_quiz_result_v1", JSON.stringify(result));
    navigate("/dashboard");
  };

  if (error) return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
      <p className="text-red-400">{error}</p>
    </div>
  );

  if (!questions) return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
      <p className="text-gray-400">Loading quiz…</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav points={870} streakDays={7} initials="SN" />
      <div className="flex-1">
        <QuizEngine
          title="Bi-Weekly Competition"
          subtitle="Your chance to earn points!"
          questions={questions}
          onFinish={onFinish}
        />
      </div>
      <Footer />
    </div>
  );
}
