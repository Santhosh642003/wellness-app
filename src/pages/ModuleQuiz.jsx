import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import QuizEngine from "../components/QuizEngine";

function getModuleQuestions(moduleId) {
  // You can customize per-module later. For now: 10 solid questions.
  // We'll reuse HPV/MenB topics depending on module.
  const base = [
    {
      id: "mq1",
      question: "What does HPV stand for?",
      options: [
        "Human Papillomavirus",
        "Human Protection Vaccine",
        "Health Prevention Virus",
        "Hepatitis Prevention Vaccine",
      ],
      answerIndex: 0,
      points: 10,
    },
    {
      id: "mq2",
      question: "HPV is most commonly spread through…",
      options: ["Air droplets", "Skin-to-skin intimate contact", "Mosquito bites", "Sharing food"],
      answerIndex: 1,
      points: 10,
    },
    {
      id: "mq3",
      question: "HPV infections are often…",
      options: ["Always severe", "Symptom-free", "Always visible", "Only bacterial"],
      answerIndex: 1,
      points: 10,
    },
    {
      id: "mq4",
      question: "HPV vaccination is most effective…",
      options: ["Before exposure to HPV", "Only after infection", "Only after age 50", "Only if symptoms appear"],
      answerIndex: 0,
      points: 10,
    },
    {
      id: "mq5",
      question: "Some HPV types can cause…",
      options: ["Certain cancers", "Diabetes", "Broken bones", "Asthma"],
      answerIndex: 0,
      points: 10,
    },
    {
      id: "mq6",
      question: "MenB refers to meningococcal disease caused by…",
      options: ["Group A", "Group B", "Group C", "A virus"],
      answerIndex: 1,
      points: 10,
    },
    {
      id: "mq7",
      question: "A serious warning sign of meningitis can include…",
      options: ["Stiff neck and fever", "Better vision", "Stronger nails", "Improved sleep"],
      answerIndex: 0,
      points: 10,
    },
    {
      id: "mq8",
      question: "MenB can spread through…",
      options: ["Sharing respiratory secretions", "Handshakes only", "Insect bites", "Water"],
      answerIndex: 0,
      points: 10,
    },
    {
      id: "mq9",
      question: "If meningitis is suspected, the best action is to…",
      options: ["Wait a few days", "Seek medical help immediately", "Ignore symptoms", "Only drink water"],
      answerIndex: 1,
      points: 10,
    },
    {
      id: "mq10",
      question: "One campus habit that reduces infection spread is…",
      options: ["Sharing drinks", "Not washing hands", "Avoid sharing drinks", "Skipping sleep"],
      answerIndex: 2,
      points: 10,
    },
  ];

  // Optional: tweak title/topics based on moduleId later
  return base.map((q) => ({ ...q, id: `${moduleId}-${q.id}` }));
}

export default function ModuleQuiz() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const questions = useMemo(() => {
    const qs = getModuleQuestions(moduleId || "module");
    return qs.map((q) => ({ ...q, chosen: null }));
  }, [moduleId]);

  const onFinish = (result) => {
    // Save result by module
    localStorage.setItem(`module_quiz_result_${moduleId}_v1`, JSON.stringify(result));

    // After passing, go back to modules (or dashboard)
    navigate("/modules");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav points={870} streakDays={7} initials="SN" />

      <div className="flex-1">
        <QuizEngine
          title="Module Quiz"
          subtitle="Answer 10 questions to unlock the next module."
          questions={questions}
          onFinish={onFinish}
        />
      </div>

      <Footer />
    </div>
  );
}
