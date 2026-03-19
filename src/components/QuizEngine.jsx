import { useState } from "react";

export default function QuizEngine({ title, subtitle, questions, onFinish, pointsLabel = "pts" }) {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null)); // selected index per question
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const totalQuestions = questions.length;
  const q = questions[currentIndex];

  const selectAnswer = (i) => {
    setAnswers((prev) => { const next = [...prev]; next[currentIndex] = i; return next; });
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowResults(true);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const submitQuiz = () => {
    const scored = questions.map((q, i) => ({ ...q, chosen: answers[i] }));
    const score = scored.reduce((sum, q) => sum + (q.chosen === q.answerIndex ? (q.points || 0) : 0), 0);
    const total = scored.reduce((s, q) => s + (q.points || 0), 0);
    const correct = scored.filter((q) => q.chosen === q.answerIndex).length;
    onFinish?.({ score, total, correct, totalQuestions, answers: scored });
  };

  // Results screen
  if (showResults) {
    const scored = questions.map((q, i) => ({ ...q, chosen: answers[i] }));
    const score = scored.reduce((sum, q) => sum + (q.chosen === q.answerIndex ? (q.points || 0) : 0), 0);
    const total = scored.reduce((s, q) => s + (q.points || 0), 0);
    const correct = scored.filter((q) => q.chosen === q.answerIndex).length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = pct >= 70;

    return (
      <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{passed ? "🎉" : "📝"}</div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-1">{passed ? "Quiz Passed!" : "Quiz Complete"}</h1>
            <p className="text-slate-500 dark:text-gray-400">{title}</p>
            <div className="mt-4 inline-flex items-center gap-6 bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 rounded-2xl px-8 py-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${passed ? "text-emerald-400" : "text-red-400"}`}>{pct}%</div>
                <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Score</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-800 dark:text-white">{correct}/{totalQuestions}</div>
                <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Correct</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{score}</div>
                <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Points</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {scored.map((q, i) => {
              const isCorrect = q.chosen === q.answerIndex;
              const unanswered = q.chosen === null;
              return (
                <div key={i} className={`bg-slate-50 dark:bg-[#141414] border rounded-2xl p-5 ${isCorrect ? "border-emerald-400/40" : unanswered ? "border-gray-600/40" : "border-red-400/40"}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-slate-900 dark:text-white font-medium text-sm">{i + 1}. {q.question}</p>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${isCorrect ? "bg-emerald-400/15 text-emerald-400" : unanswered ? "bg-gray-400/15 text-gray-400" : "bg-red-400/15 text-red-400"}`}>
                      {unanswered ? "Skipped" : isCorrect ? `+${q.points || 0} ${pointsLabel}` : "0 pts"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isAnswer = oi === q.answerIndex;
                      const isChosen = oi === q.chosen;
                      return (
                        <div key={oi} className={`px-4 py-2.5 rounded-xl border text-sm ${isAnswer ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 font-medium" : isChosen && !isAnswer ? "border-red-400 bg-red-50 dark:bg-red-400/10 text-red-700 dark:text-red-300 line-through" : "border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-500"}`}>
                          {isAnswer ? "✓ " : isChosen ? "✗ " : ""}{opt}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="text-slate-400 dark:text-gray-500 text-xs mt-3 italic">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button onClick={submitQuiz} className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition text-lg">
              {passed ? "Claim Points & Finish" : "Finish Quiz"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
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

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mb-2">
            <span>Question {currentIndex + 1} of {totalQuestions}</span>
            <span>{answers.filter((a) => a !== null).length} answered</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-400 dark:text-gray-400 mb-6">
            <span>Question <span className="text-slate-700 dark:text-gray-200">{currentIndex + 1}</span> of <span className="text-slate-700 dark:text-gray-200">{totalQuestions}</span></span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300">{q.points || 0} {pointsLabel}</span>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{q.question}</h2>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const chosen = answers[currentIndex] === i;
              return (
                <button
                  key={`${currentIndex}-${i}`}
                  onClick={() => selectAnswer(i)}
                  className={[
                    "w-full text-left px-5 py-4 rounded-xl border transition",
                    chosen
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 text-slate-900 dark:text-white"
                      : "border-slate-200 dark:border-gray-800 bg-white dark:bg-[#101010] text-slate-800 dark:text-gray-100 hover:border-blue-400/60",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${chosen ? "border-emerald-400 bg-emerald-400" : "border-slate-300 dark:border-gray-600"}`}>
                      {chosen && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <span>{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="px-5 py-3 rounded-xl text-sm font-medium border border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={goNext}
              className={`px-6 py-3 rounded-xl font-semibold transition ${answers[currentIndex] !== null ? "bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90" : "bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-gray-500"}`}
            >
              {currentIndex === totalQuestions - 1 ? "View Results" : "Next →"}
            </button>
          </div>

          {/* Question dots */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-7 w-7 rounded-full text-xs font-medium border transition ${i === currentIndex ? "border-blue-400 bg-blue-500/20 text-blue-400" : answers[i] !== null ? "border-emerald-400 bg-emerald-400/10 text-emerald-400" : "border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
