import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check, Settings } from 'lucide-react';

function QuestionForm({ form, setForm, onSave, onCancel, saving }) {
  const opts = Array.isArray(form.options) ? form.options : ['', '', '', ''];
  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-white text-xs font-semibold uppercase tracking-wide">{form.id ? 'Edit Question' : 'New Question'}</p>
      <div>
        <label className="text-gray-400 text-xs">Question text</label>
        <textarea value={form.question} rows={2}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((opt, i) => (
          <div key={i}>
            <label className={`text-xs ${i === form.answerIndex ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
              Option {String.fromCharCode(65 + i)} {i === form.answerIndex ? '✓ correct' : ''}
            </label>
            <div className="flex gap-1.5 mt-1">
              <input value={opt}
                onChange={e => setForm(f => ({ ...f, options: opts.map((o, j) => j === i ? e.target.value : o) }))}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              <button onClick={() => setForm(f => ({ ...f, answerIndex: i }))}
                title="Mark as correct"
                className={`w-8 rounded-lg text-xs font-bold transition-colors ${i === form.answerIndex ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-500 hover:text-emerald-400'}`}>
                ✓
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs">Points for this question</label>
          <input type="number" min="1" value={form.points}
            onChange={e => setForm(f => ({ ...f, points: +e.target.value }))}
            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-gray-400 text-xs">Explanation (shown after answer)</label>
          <input value={form.explanation || ''}
            onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
            placeholder="Optional"
            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
          <Check size={13} />{saving ? 'Saving…' : 'Save Question'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-gray-700 transition-colors">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

function QuizSettingsForm({ quiz, onSave, onClose }) {
  const [title, setTitle] = useState(quiz.title);
  const [passingScore, setPassingScore] = useState(quiz.passingScore);
  // Convert stored UTC ISO string to local datetime-local input format
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(quiz.scheduledAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isBiweekly = quiz.type === 'biweekly';

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        title,
        passingScore: parseInt(passingScore),
        ...(isBiweekly ? { scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null } : {}),
      };
      await api.updateQuiz(quiz.id, payload);
      onSave({ ...quiz, ...payload });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearSchedule = async () => {
    setSaving(true); setError('');
    try {
      await api.updateQuiz(quiz.id, { scheduledAt: null });
      setScheduledAt('');
      onSave({ ...quiz, scheduledAt: null });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-white text-xs font-semibold uppercase tracking-wide">Quiz Settings</p>
      <div>
        <label className="text-gray-400 text-xs">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div>
        <label className="text-gray-400 text-xs">Passing Score (%)</label>
        <input type="number" min="1" max="100" value={passingScore}
          onChange={e => setPassingScore(e.target.value)}
          className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
      </div>
      {isBiweekly && (
        <div>
          <label className="text-gray-400 text-xs flex items-center gap-1">
            🗓 Scheduled Open Date
            <span className="text-gray-600 font-normal">(optional — quiz is locked until this date/time)</span>
          </label>
          <div className="flex gap-2 mt-1">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
            {scheduledAt && (
              <button type="button" onClick={clearSchedule} disabled={saving}
                className="px-3 py-2 bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 rounded-lg text-xs transition-colors disabled:opacity-50">
                Clear
              </button>
            )}
          </div>
          {scheduledAt && (
            <p className="text-xs mt-1 text-gray-500">
              Quiz will be locked until {new Date(scheduledAt).toLocaleString()}
            </p>
          )}
          {!scheduledAt && quiz.scheduledAt && (
            <p className="text-xs mt-1 text-emerald-500">Currently locked until {new Date(quiz.scheduledAt).toLocaleString()}</p>
          )}
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
          <Check size={13} />{saving ? 'Saving…' : 'Save Settings'}
        </button>
        <button onClick={onClose}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-gray-700 transition-colors">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [questions, setQuestions] = useState({});
  const [qForm, setQForm] = useState(null);
  const [settingsQuizId, setSettingsQuizId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.quizzes().then(setQuizzes).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleExpand = async (quizId) => {
    if (expanded === quizId) { setExpanded(null); setQForm(null); setSettingsQuizId(null); return; }
    setExpanded(quizId);
    if (!questions[quizId]) {
      const qs = await api.questions(quizId);
      setQuestions(prev => ({ ...prev, [quizId]: qs }));
    }
  };

  const saveQ = async () => {
    if (!qForm.question.trim()) return;
    setSaving(true);
    try {
      if (qForm.id) await api.updateQuestion(qForm.id, qForm);
      else await api.createQuestion(qForm);
      const qs = await api.questions(qForm.quizId);
      setQuestions(prev => ({ ...prev, [qForm.quizId]: qs }));
      setQForm(null);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const delQ = async (id, quizId) => {
    if (!confirm('Delete this question?')) return;
    await api.deleteQuestion(id);
    const qs = await api.questions(quizId);
    setQuestions(prev => ({ ...prev, [quizId]: qs }));
  };

  const delQuiz = async (quizId) => {
    if (!confirm('Delete this entire quiz and all its questions? This cannot be undone.')) return;
    try {
      await api.deleteQuiz(quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      if (expanded === quizId) setExpanded(null);
    } catch (err) { alert(err.message); }
  };

  const onSettingsSaved = (updated) => {
    setQuizzes(prev => prev.map(q => q.id === updated.id ? { ...q, ...updated } : q));
    setSettingsQuizId(null);
  };

  const TYPE_COLORS = {
    module: 'bg-blue-600/10 border-blue-600/20 text-blue-400',
    biweekly: 'bg-purple-600/10 border-purple-600/20 text-purple-400',
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Quizzes & Questions</h2>
        <p className="text-gray-400 text-sm mt-1">{quizzes.length} quizzes · Manage questions, passing scores, and quiz settings</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📝</p>
          <p>No quizzes yet — create a module first to auto-generate a quiz.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => {
            const qs = questions[quiz.id] || [];
            const isExpanded = expanded === quiz.id;
            const typeColor = TYPE_COLORS[quiz.type] || TYPE_COLORS.module;
            return (
              <div key={quiz.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Quiz header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button onClick={() => toggleExpand(quiz.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{quiz.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${typeColor}`}>
                          {quiz.type}
                        </span>
                        <span className="text-gray-500 text-xs">{quiz.questionCount} question{quiz.questionCount !== 1 ? 's' : ''}</span>
                        <span className="text-gray-500 text-xs">·</span>
                        <span className="text-gray-500 text-xs">{quiz.passingScore}% to pass</span>
                        {quiz.moduleTitle && <span className="text-gray-600 text-xs">· {quiz.moduleTitle}</span>}
                        {quiz.scheduledAt && new Date(quiz.scheduledAt) > new Date() && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-orange-600/10 border-orange-600/20 text-orange-400 flex items-center gap-1">
                            🔒 opens {new Date(quiz.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                        {quiz.scheduledAt && new Date(quiz.scheduledAt) <= new Date() && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-emerald-600/10 border-emerald-600/20 text-emerald-400">
                            🔓 open
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setSettingsQuizId(settingsQuizId === quiz.id ? null : quiz.id)}
                      title="Quiz settings"
                      className={`p-1.5 rounded-lg transition-colors ${settingsQuizId === quiz.id ? 'text-emerald-400 bg-emerald-600/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}>
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={() => delQuiz(quiz.id)}
                      title="Delete quiz"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Settings panel */}
                {settingsQuizId === quiz.id && (
                  <div className="border-t border-gray-800 px-5 pt-4">
                    <QuizSettingsForm quiz={quiz} onSave={onSettingsSaved} onClose={() => setSettingsQuizId(null)} />
                  </div>
                )}

                {/* Questions panel */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-5">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-gray-400 text-xs">{qs.length} question{qs.length !== 1 ? 's' : ''} · total {qs.reduce((a, q) => a + (q.points || 10), 0)} pts</p>
                      <button
                        onClick={() => setQForm(qForm?.quizId === quiz.id && !qForm?.id ? null : { quizId: quiz.id, question: '', options: ['', '', '', ''], answerIndex: 0, points: quiz.type === 'biweekly' ? 20 : 10, explanation: '' })}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                        <Plus size={14} /> Add Question
                      </button>
                    </div>

                    {qForm?.quizId === quiz.id && (
                      <QuestionForm form={qForm} setForm={setQForm} onSave={saveQ} onCancel={() => setQForm(null)} saving={saving} />
                    )}

                    <div className="space-y-2">
                      {qs.map((q, idx) => {
                        const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
                        return (
                          <div key={q.id} className="flex items-start gap-3 bg-gray-800/40 border border-gray-800 rounded-lg px-4 py-3">
                            <span className="text-gray-600 text-xs w-5 shrink-0 mt-0.5">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-200 text-sm mb-1.5">{q.question}</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                {opts.map((opt, i) => (
                                  <p key={i} className={`text-xs ${i === q.answerIndex ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
                                    {String.fromCharCode(65 + i)}. {opt}
                                  </p>
                                ))}
                              </div>
                              {q.explanation && <p className="text-gray-600 text-xs mt-1.5 italic">"{q.explanation}"</p>}
                              <p className="text-gray-700 text-xs mt-1">{q.points} pts</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => setQForm({ ...q, options: opts })}
                                title="Edit"
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => delQ(q.id, quiz.id)}
                                title="Delete"
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        );
                      })}
                      {qs.length === 0 && !qForm && (
                        <p className="text-gray-600 text-sm text-center py-4">No questions yet — add one above</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
