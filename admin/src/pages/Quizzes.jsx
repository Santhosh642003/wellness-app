import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [questions, setQuestions] = useState({});
  const [qForm, setQForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.quizzes().then(setQuizzes).catch(console.error);
  useEffect(() => { load(); }, []);

  const toggleExpand = async (quizId) => {
    if (expanded === quizId) { setExpanded(null); return; }
    setExpanded(quizId);
    if (!questions[quizId]) {
      const qs = await api.questions(quizId);
      setQuestions(prev => ({...prev, [quizId]: qs}));
    }
  };

  const saveQ = async () => {
    setSaving(true);
    try {
      if (qForm.id) { await api.updateQuestion(qForm.id, qForm); }
      else { await api.createQuestion(qForm); }
      const qs = await api.questions(qForm.quizId);
      setQuestions(prev => ({...prev, [qForm.quizId]: qs}));
      setQForm(null);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const delQ = async (id, quizId) => {
    if (!confirm('Delete this question?')) return;
    await api.deleteQuestion(id);
    const qs = await api.questions(quizId);
    setQuestions(prev => ({...prev, [quizId]: qs}));
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Quizzes & Questions</h2>

      <div className="space-y-3">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button onClick={() => toggleExpand(quiz.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-800/50 transition-colors">
              {expanded === quiz.id ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
              <div className="flex-1">
                <p className="text-white font-medium">{quiz.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{quiz.type} · {quiz.questionCount} questions · {quiz.passingScore}% to pass · {quiz.moduleTitle || 'Bi-Weekly'}</p>
              </div>
            </button>

            {expanded === quiz.id && (
              <div className="border-t border-gray-800 p-5">
                <div className="flex justify-end mb-4">
                  <button onClick={() => setQForm({ quizId: quiz.id, question:'', options:['','','',''], answerIndex:0, points: quiz.type==='biweekly'?20:10, explanation:'' })}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    <Plus size={14}/> Add Question
                  </button>
                </div>

                {qForm?.quizId === quiz.id && (
                  <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-3">
                    <div>
                      <label className="text-gray-400 text-xs">Question</label>
                      <textarea value={qForm.question} onChange={e => setQForm(f => ({...f,question:e.target.value}))} rows={2}
                        className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {qForm.options.map((opt, i) => (
                        <div key={i}>
                          <label className="text-gray-500 text-xs">Option {i+1} {i === qForm.answerIndex && '✓ correct'}</label>
                          <div className="flex gap-2 mt-1">
                            <input value={opt} onChange={e => setQForm(f => ({...f,options:f.options.map((o,j)=>j===i?e.target.value:o)}))}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                            <button onClick={() => setQForm(f => ({...f,answerIndex:i}))}
                              className={`px-2 py-1 rounded text-xs ${i===qForm.answerIndex?'bg-emerald-600 text-white':'bg-gray-700 text-gray-400 hover:text-white'}`}>✓</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs">Points</label>
                        <input type="number" value={qForm.points} onChange={e => setQForm(f => ({...f,points:+e.target.value}))}
                          className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs">Explanation (optional)</label>
                        <input value={qForm.explanation} onChange={e => setQForm(f => ({...f,explanation:e.target.value}))}
                          className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveQ} disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs"><Check size={13}/>{saving?'Saving…':'Save'}</button>
                      <button onClick={() => setQForm(null)} className="flex items-center gap-1 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-gray-700"><X size={13}/>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {(questions[quiz.id] || []).map((q, idx) => (
                    <div key={q.id} className="flex items-start gap-3 bg-gray-800/50 rounded-lg px-4 py-3">
                      <span className="text-gray-600 text-sm w-5 shrink-0">{idx+1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-sm">{q.question}</p>
                        <div className="grid grid-cols-2 gap-x-4 mt-1">
                          {q.options.map((opt, i) => (
                            <p key={i} className={`text-xs ${i===q.answerIndex?'text-emerald-400 font-medium':'text-gray-500'}`}>{String.fromCharCode(65+i)}. {opt}</p>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setQForm({...q, options: Array.isArray(q.options)?q.options:JSON.parse(q.options)})} className="text-gray-500 hover:text-white"><Pencil size={13}/></button>
                        <button onClick={() => delQ(q.id, quiz.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
