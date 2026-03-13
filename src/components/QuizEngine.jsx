import { useMemo, useState } from "react";

export default function QuizEngine({ title, subtitle, questions, onFinish, pointsLabel = "pts" }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const q = questions[index];
  const totalQuestions = questions.length;

  const scoreSoFar = useMemo(() => {
    let s = 0;
    for (let i = 0; i < index; i++) {
      if (questions[i].chosen === questions[i].answerIndex) s += questions[i].points || 0;
    }
    return s;
  }, [index, questions]);

  const submit = () => { if (selected === null) return; setSubmitted(true); };

  const next = () => {
    const updated = [...questions];
    updated[index] = { ...updated[index], chosen: selected };
    const isLast = index === totalQuestions - 1;
    if (isLast) {
      const finalScore = updated.reduce((sum, item) => sum + (item.chosen === item.answerIndex ? (item.points || 0) : 0), 0);
      onFinish?.({ score: finalScore, total: updated.reduce((s, i) => s + (i.points || 0), 0), correct: updated.filter((x) => x.chosen === x.answerIndex).length, totalQuestions, answers: updated });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
  };

  const isCorrect = submitted && selected === q.answerIndex;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 text-slate-800 dark:text-gray-200">
            <span className="text-3xl">🏅</span>
            <h1 className="text-3xl font-semibold">{title}</h1>
          </div>
          <p className="text-slate-500 dark:text-gray-400 mt-2">{subtitle}</p>
        </div>

        <div className="bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-400 dark:text-gray-400 mb-6">
            <span>Question <span className="text-slate-700 dark:text-gray-200">{index + 1}</span> of <span className="text-slate-700 dark:text-gray-200">{totalQuestions}</span></span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300">{q.points || 0} {pointsLabel}</span>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{q.question}</h2>

          <div className="space-y-4">
            {q.options.map((opt, i) => {
              const chosen = selected === i;
              const correct = submitted && i === q.answerIndex;
              const wrongChosen = submitted && chosen && i !== q.answerIndex;
              return (
                <button
                  key={`${index}-${i}`}
                  onClick={() => setSelected(i)}
                  disabled={submitted}
                  className={[
                    "w-full text-left px-5 py-4 rounded-xl border transition",
                    chosen ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-400/10" : "border-slate-200 dark:border-gray-800 bg-white dark:bg-[#101010]",
                    submitted ? "opacity-95" : "hover:border-blue-400/60",
                    correct ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-400/15" : "",
                    wrongChosen ? "border-red-400 bg-red-50 dark:bg-red-400/10" : "",
                  ].join(" ")}
                >
                  <span className="text-slate-800 dark:text-gray-100">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-slate-400 dark:text-gray-400">
              Score so far: <span className="text-slate-700 dark:text-gray-200">{scoreSoFar}</span>
            </div>
            {!submitted ? (
              <button onClick={submit} disabled={selected === null} className={`px-6 py-3 rounded-xl font-semibold ${selected === null ? "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
                Submit Answer
              </button>
            ) : (
              <button onClick={next} className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition">
                {index === totalQuestions - 1 ? "Finish Quiz" : "Next Question"}
              </button>
            )}
          </div>

          {submitted && (
            <div className="mt-6 text-sm">
              {isCorrect
                ? <p className="text-emerald-500 dark:text-emerald-300">✅ Correct!</p>
                : <p className="text-red-500 dark:text-red-300">❌ Correct answer: <span className="text-slate-700 dark:text-gray-200">{q.options[q.answerIndex]}</span></p>
              }
              {q.explanation && <p className="text-slate-400 dark:text-gray-400 mt-2">{q.explanation}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
