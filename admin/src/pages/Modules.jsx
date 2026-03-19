import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Plus, Pencil, Trash2, X, Check, Upload, ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY = { slug: '', title: '', description: '', duration: '', category: 'HPV', orderIndex: 0, pointsValue: 100, locked: true, videoUrl: '' };
const EMPTY_Q = { question: '', options: ['', '', '', ''], answerIndex: 0, points: 10, explanation: '' };

function VideoUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setProgress(0); setError('');
    try {
      const result = await api.uploadVideo(file, setProgress);
      onChange(result.url);
    } catch (err) { setError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 disabled:opacity-50">
          <Upload size={14} />{uploading ? `Uploading ${progress}%` : 'Upload video'}
        </button>
        <span className="text-gray-500 text-sm self-center">or paste URL below</span>
      </div>
      {uploading && (
        <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or /uploads/filename.mp4"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
      {value && <p className="text-gray-500 text-xs truncate">Current: {value}</p>}
    </div>
  );
}

function QuizEditor({ moduleId }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newQ, setNewQ] = useState({ ...EMPTY_Q });
  const [editingQ, setEditingQ] = useState(null);
  const [savingQ, setSavingQ] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.quizzes().then((all) => {
      const q = all.find((q) => q.moduleId === moduleId);
      setQuiz(q || null);
      if (q) {
        api.questions(q.id).then(setQuestions).catch(console.error);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [moduleId, open]);

  const createQuiz = async () => {
    try {
      const q = await api.createQuiz({ moduleId, type: 'module', title: 'Module Quiz', passingScore: 70 });
      setQuiz(q);
      setQuestions([]);
    } catch (err) { alert(err.message); }
  };

  const saveQuestion = async () => {
    if (!quiz) return;
    setSavingQ(true);
    try {
      const q = editingQ || newQ;
      if (!q.question.trim() || q.options.some((o) => !o.trim())) {
        alert('Fill in the question and all options.'); return;
      }
      if (editingQ?.id) {
        const updated = await api.updateQuestion(editingQ.id, {
          question: q.question, options: q.options, answerIndex: q.answerIndex,
          points: Number(q.points), explanation: q.explanation || undefined,
          orderIndex: questions.findIndex((x) => x.id === editingQ.id),
        });
        setQuestions((prev) => prev.map((x) => x.id === updated.id ? updated : x));
        setEditingQ(null);
      } else {
        const added = await api.createQuestion({
          quizId: quiz.id, question: q.question, options: q.options,
          answerIndex: q.answerIndex, points: Number(q.points),
          explanation: q.explanation || undefined, orderIndex: questions.length,
        });
        setQuestions((prev) => [...prev, added]);
        setNewQ({ ...EMPTY_Q });
      }
    } catch (err) { alert(err.message); }
    finally { setSavingQ(false); }
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    await api.deleteQuestion(id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const qForm = editingQ || newQ;
  const setQForm = editingQ ? setEditingQ : setNewQ;

  return (
    <div className="mt-6 border-t border-gray-700 pt-5">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition">
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Quiz Editor {quiz ? `(${questions.length} questions)` : '(no quiz yet)'}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {loading && <p className="text-gray-500 text-sm">Loading…</p>}
          {!loading && !quiz && (
            <button onClick={createQuiz}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
              <Plus size={14} /> Create Quiz for this Module
            </button>
          )}

          {quiz && (
            <>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 flex items-start gap-3">
                    <span className="text-gray-500 text-xs mt-0.5 shrink-0 font-mono">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{q.question}</p>
                      <p className="text-emerald-400 text-xs mt-0.5">✓ {q.options?.[q.answerIndex]} · {q.points}pts</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingQ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options) })}
                        className="text-gray-400 hover:text-white p-1"><Pencil size={13} /></button>
                      <button onClick={() => deleteQuestion(q.id)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit question form */}
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                <h4 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">
                  {editingQ ? 'Edit Question' : 'Add Question'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Question *</label>
                    <input value={qForm.question} onChange={(e) => setQForm((f) => ({ ...f, question: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Options (mark correct answer)</label>
                    <div className="space-y-2">
                      {qForm.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`answer-${editingQ ? 'edit' : 'new'}`} checked={qForm.answerIndex === oi}
                            onChange={() => setQForm((f) => ({ ...f, answerIndex: oi }))} className="accent-emerald-400" />
                          <input value={opt} onChange={(e) => setQForm((f) => { const opts = [...f.options]; opts[oi] = e.target.value; return { ...f, options: opts }; })}
                            placeholder={`Option ${oi + 1}`}
                            className={`flex-1 bg-gray-900 border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none ${qForm.answerIndex === oi ? 'border-emerald-500' : 'border-gray-700'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-gray-400 text-xs mb-1">Points</label>
                      <input type="number" value={qForm.points} onChange={(e) => setQForm((f) => ({ ...f, points: +e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-gray-400 text-xs mb-1">Explanation (optional)</label>
                      <input value={qForm.explanation} onChange={(e) => setQForm((f) => ({ ...f, explanation: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveQuestion} disabled={savingQ}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm">
                      <Check size={14} />{savingQ ? 'Saving…' : editingQ ? 'Update' : 'Add Question'}
                    </button>
                    {editingQ && (
                      <button onClick={() => setEditingQ(null)} className="flex items-center gap-2 text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg text-sm">
                        <X size={14} />Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.modules().then(setModules).catch(console.error);
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) { await api.updateModule(form.id, form); }
      else { await api.createModule(form); }
      setForm(null); load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this module?')) return;
    await api.deleteModule(id); load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Modules</h2>
        <button onClick={() => setForm({ ...EMPTY })} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Module
        </button>
      </div>

      {form && (
        <div className="bg-gray-900 border border-emerald-600/40 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{form.id ? 'Edit Module' : 'New Module'}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[['title','Title'],['slug','Slug'],['description','Description'],['duration','Duration (e.g. 12 min)']].map(([k,label]) => (
              <div key={k} className={k === 'description' ? 'col-span-2' : ''}>
                <label className="block text-gray-400 text-xs mb-1">{label}</label>
                <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-gray-400 text-xs mb-2">Video</label>
              <VideoUploader value={form.videoUrl} onChange={(url) => setForm(f => ({ ...f, videoUrl: url }))} />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f,category:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {['HPV','MenB','Bonus', 'Foundations'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Points Value</label>
              <input type="number" value={form.pointsValue} onChange={e => setForm(f => ({...f,pointsValue:+e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Order Index</label>
              <input type="number" value={form.orderIndex} onChange={e => setForm(f => ({...f,orderIndex:+e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="locked" checked={form.locked} onChange={e => setForm(f => ({...f,locked:e.target.checked}))} />
              <label htmlFor="locked" className="text-gray-300 text-sm">Locked</label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm"><Check size={16}/>{saving?'Saving…':'Save Module'}</button>
            <button onClick={() => setForm(null)} className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm border border-gray-700"><X size={16}/>Cancel</button>
          </div>

          {/* Quiz editor — only shown when editing an existing module */}
          {form.id && <QuizEditor moduleId={form.id} />}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-3">#</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Duration</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Video</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {modules.map(m => (
              <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-gray-500">{m.orderIndex}</td>
                <td className="px-4 py-3 text-white font-medium">{m.title}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-300 border border-blue-800/30">{m.category}</span></td>
                <td className="px-4 py-3 text-gray-400">{m.duration}</td>
                <td className="px-4 py-3 text-emerald-400">{m.pointsValue}</td>
                <td className="px-4 py-3">{m.videoUrl ? <span className="text-xs text-emerald-400">✓ set</span> : <span className="text-xs text-gray-600">—</span>}</td>
                <td className="px-4 py-3"><span className={`text-xs ${m.locked ? 'text-red-400':'text-emerald-400'}`}>{m.locked?'Locked':'Unlocked'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setForm({...m})} className="text-gray-400 hover:text-white"><Pencil size={14}/></button>
                    <button onClick={() => del(m.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
