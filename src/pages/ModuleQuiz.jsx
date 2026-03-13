import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import QuizEngine from "../components/QuizEngine";

export default function ModuleQuiz() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("wellness_token");
    fetch(`/api/modules/${moduleId}/quiz`, {
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
  }, [moduleId]);

  const onFinish = (result) => {
    localStorage.setItem(`module_quiz_result_${moduleId}_v1`, JSON.stringify(result));
    navigate("/modules");
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
          title="Module Quiz"
          subtitle="Answer the questions to unlock the next module."
          questions={questions}
          onFinish={onFinish}
        />
      </div>
      <Footer />
    </div>
  );
}
