import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import QuizEngine from "../components/QuizEngine";

const BIWEEKLY_QUESTIONS = [
  // HPV (10)
  {
    id: "q1",
    question: "What does HPV stand for?",
    options: [
      "Human Papillomavirus",
      "Human Protection Vaccine",
      "Health Prevention Virus",
      "Hepatitis Prevention Vaccine",
    ],
    answerIndex: 0,
    points: 20,
    explanation: "HPV stands for Human Papillomavirus.",
  },
  {
    id: "q2",
    question: "HPV is primarily spread through…",
    options: [
      "Air droplets",
      "Skin-to-skin intimate contact",
      "Sharing food",
      "Mosquito bites",
    ],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q3",
    question: "Some HPV infections can lead to…",
    options: ["Only the common cold", "Certain cancers", "Diabetes", "Asthma"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q4",
    question: "HPV vaccines work best when given…",
    options: [
      "After infection",
      "Before exposure to HPV",
      "Only after age 40",
      "Only if symptoms appear",
    ],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q5",
    question: "HPV infections are often…",
    options: ["Always severe", "Symptom-free", "Only seen in children", "Only bacterial infections"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q6",
    question: "Which is a common prevention strategy for HPV?",
    options: ["Vaccination", "Antibiotics", "Avoiding water", "Taking vitamin C only"],
    answerIndex: 0,
    points: 20,
  },
  {
    id: "q7",
    question: "HPV vaccines protect against…",
    options: ["All viruses", "Some high-risk and wart-causing HPV types", "Only flu", "Only COVID-19"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q8",
    question: "A Pap test helps detect…",
    options: ["HPV-related cervical cell changes", "Diabetes", "Hearing loss", "Bone fractures"],
    answerIndex: 0,
    points: 20,
  },
  {
    id: "q9",
    question: "HPV can affect…",
    options: ["Only women", "Only men", "People of any sex", "Only athletes"],
    answerIndex: 2,
    points: 20,
  },
  {
    id: "q10",
    question: "Genital warts are most often caused by…",
    options: ["High-risk HPV types", "Low-risk HPV types", "Influenza virus", "Strep bacteria"],
    answerIndex: 1,
    points: 20,
  },

  // MenB (10)
  {
    id: "q11",
    question: "MenB refers to meningococcal disease caused by…",
    options: ["Group A meningococcus", "Group B meningococcus", "Group C meningococcus", "A virus"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q12",
    question: "Meningococcal disease can progress…",
    options: ["Very slowly over months", "Very quickly and be life-threatening", "Only in winter", "Only in children"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q13",
    question: "MenB is spread through…",
    options: ["Casual handshakes", "Sharing respiratory secretions (e.g., kissing, sharing drinks)", "Eating spicy food", "Insect bites"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q14",
    question: "A warning sign of meningitis can include…",
    options: ["Stiff neck and fever", "Better sleep quality", "Stronger nails", "Improved vision"],
    answerIndex: 0,
    points: 20,
  },
  {
    id: "q15",
    question: "College students may be at higher risk of MenB due to…",
    options: ["Living in close quarters", "Using laptops", "Exercising", "Studying too much"],
    answerIndex: 0,
    points: 20,
  },
  {
    id: "q16",
    question: "Vaccination can help prevent…",
    options: ["Only headaches", "Some forms of meningococcal disease, including MenB", "All bacterial infections", "All cancers"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q17",
    question: "If you suspect meningitis, you should…",
    options: ["Wait a week", "Seek medical help immediately", "Drink only water", "Ignore if young"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q18",
    question: "Meningococcal disease can cause…",
    options: ["Meningitis and bloodstream infection", "Only mild cold", "Only stomach ache", "Only seasonal allergies"],
    answerIndex: 0,
    points: 20,
  },
  {
    id: "q19",
    question: "One way to reduce MenB spread on campus is…",
    options: ["Share drinks", "Avoid sharing drinks and practice good hygiene", "Skip sleep", "Never wash hands"],
    answerIndex: 1,
    points: 20,
  },
  {
    id: "q20",
    question: "MenB symptoms can become severe within…",
    options: ["Minutes to hours", "Several years", "Only after 6 months", "Only on weekends"],
    answerIndex: 0,
    points: 20,
  },
];

export default function BiWeeklyQuiz() {
  const navigate = useNavigate();

  const questions = useMemo(
    () => BIWEEKLY_QUESTIONS.map((q) => ({ ...q, chosen: null })),
    []
  );

  const onFinish = (result) => {
    localStorage.setItem("biweekly_quiz_result_v1", JSON.stringify(result));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav points={870} streakDays={7} initials="SN" />
      <div className="flex-1">
        <QuizEngine
          title="Bi-Weekly Competition"
          subtitle="Your chance to earn 300 points!"
          questions={questions}
          onFinish={onFinish}
        />
      </div>
      <Footer />
    </div>
  );
}
