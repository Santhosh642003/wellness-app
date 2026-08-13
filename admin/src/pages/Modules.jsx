import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Plus, Pencil, Trash2, X, Check, Upload, ChevronDown, ChevronUp, Info, FileText, Video } from 'lucide-react';

const CATEGORIES = ['Foundations', 'HPV', 'MenB', 'Bonus', 'General'];

const EMPTY = {
  slug: '', title: '', description: '', duration: '', category: 'Foundations',
  orderIndex: 0, pointsValue: 100, locked: true,
  thumbnailUrl: '', videos: [], documents: [], keyPoints: [],
};

function ThumbnailUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setProgress(0); setError('');
    try {
      const result = await api.uploadImage(file, setProgress);
      onChange(result.url);
    } catch (err) { setError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start">
        {value && (
          <div className="h-14 w-24 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0">
            <img src={value} alt="Thumbnail" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 disabled:opacity-50">
              <Upload size={13} />{uploading ? `Uploading ${progress}%` : 'Upload image'}
            </button>
            {value && <button type="button" onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 text-xs px-2">Remove</button>}
          </div>
          {uploading && (
            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or paste upload URL"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>
    </div>
  );
}

const EMPTY_Q = { question: '', options: ['', '', '', ''], answerIndex: 0, points: 10, explanation: '' };
const EMPTY_VIDEO = { id: '', title: '', url: '', duration: '', transcript: [] };
const EMPTY_DOC = { id: '', title: '', url: '', fileType: '', size: '' };

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function parseKeyPoints(raw) {
  return raw.split('\n').map((s) => s.trim()).filter(Boolean);
}
function tempId() {
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

// ── Single Video Row (with per-video transcript) ───────────────────────────

function VideoRow({ video, index, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptRaw, setTranscriptRaw] = useState(() =>
    Array.isArray(video.transcript) && video.transcript.length > 0
      ? JSON.stringify(video.transcript, null, 2)
      : ''
  );
  const [transcriptError, setTranscriptError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setProgress(0); setUploadError('');
    try {
      const r = await api.uploadVideo(file, setProgress);
      onChange({ ...video, url: r.url });
    } catch (err) { setUploadError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleTranscriptChange = (raw) => {
    setTranscriptRaw(raw);
    setTranscriptError('');
    if (!raw.trim()) { onChange({ ...video, transcript: [] }); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error();
      onChange({ ...video, transcript: parsed });
    } catch {
      setTranscriptError('Invalid JSON — format: [{"time": 0, "text": "..."}]');
    }
  };

  const transcriptCount = Array.isArray(video.transcript) ? video.transcript.length : 0;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* Title / duration / reorder */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={onMoveUp} disabled={index === 0}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition">
              <ChevronUp size={12} />
            </button>
            <button type="button" onClick={onMoveDown} disabled={index === total - 1}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-20 transition">
              <ChevronDown size={12} />
            </button>
          </div>
          <div className="h-7 w-7 rounded-lg bg-blue-900/40 border border-blue-800/40 flex items-center justify-center text-blue-400 text-xs font-bold">
            {index + 1}
          </div>
          <input
            value={video.title}
            onChange={(e) => onChange({ ...video, title: e.target.value })}
            placeholder={`Chapter ${index + 1} title`}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500 flex-1 min-w-0 w-48"
          />
          <input
            value={video.duration}
            onChange={(e) => onChange({ ...video, duration: e.target.value })}
            placeholder="Duration (e.g. 5:30)"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500 w-32"
          />
        </div>
        <button type="button" onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition shrink-0 p-1">
          <Trash2 size={14} />
        </button>
      </div>

      {/* URL / upload */}
      <div className="flex gap-2 flex-wrap items-center">
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs hover:bg-gray-600 disabled:opacity-50 transition">
          <Upload size={12} />{uploading ? `${progress}%` : 'Upload'}
        </button>
        <input
          value={video.url}
          onChange={(e) => onChange({ ...video, url: e.target.value })}
          placeholder="or paste video URL…"
          className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>
      {uploading && (
        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}
      {video.url && !uploading && <p className="text-emerald-400 text-xs flex items-center gap-1"><Check size={10} /> Video URL set</p>}

      {/* ── Per-video subtitles & transcript ── */}
      <div className="border-t border-gray-700/50 pt-2.5">
        <button type="button" onClick={() => setTranscriptOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
          {transcriptOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span>Subtitles &amp; Transcript</span>
          {transcriptCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800/30 text-[10px]">
              {transcriptCount} lines
            </span>
          )}
        </button>

        {transcriptOpen && (
          <div className="mt-2.5 space-y-1.5">
            <p className="text-gray-600 text-[10px]">
              JSON array of time-stamped lines — displayed as captions and full transcript in the player
            </p>
            <textarea
              rows={7}
              value={transcriptRaw}
              onChange={(e) => handleTranscriptChange(e.target.value)}
              spellCheck={false}
              placeholder={'[\n  { "time": 0, "text": "Welcome to this chapter." },\n  { "time": 5, "text": "Today we will cover..." },\n  { "time": 12, "text": "Let\'s get started." }\n]'}
              className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white text-xs focus:outline-none font-mono resize-y
                ${transcriptError ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'}`}
            />
            {transcriptError && <p className="text-red-400 text-[10px]">{transcriptError}</p>}
            {!transcriptError && transcriptRaw.trim() && transcriptCount > 0 && (
              <p className="text-emerald-400 text-[10px]">✓ {transcriptCount} transcript entries</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Document Row ───────────────────────────────────────────────────────────

function DocumentRow({ doc, index, onChange, onRemove }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true); setProgress(0); setError('');
    try {
      const r = await api.uploadDocument(file, setProgress);
      onChange({ ...doc, url: r.url, fileType: r.fileType || doc.fileType, size: r.size || doc.size, title: doc.title || r.originalName });
    } catch (err) { setError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const FILE_TYPE_OPTIONS = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt', 'zip', 'other'];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs font-mono w-5 text-right shrink-0">{index + 1}.</span>
        <input
          value={doc.title}
          onChange={(e) => onChange({ ...doc, title: e.target.value })}
          placeholder="Document title"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500"
        />
        <select
          value={doc.fileType}
          onChange={(e) => onChange({ ...doc, fileType: e.target.value })}
          className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="">Type</option>
          {FILE_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>
        <button type="button" onClick={onRemove} className="text-gray-500 hover:text-red-400 transition p-1 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs hover:bg-gray-600 disabled:opacity-50 transition">
          <Upload size={12} />{uploading ? `${progress}%` : 'Upload File'}
        </button>
        <input
          value={doc.url}
          onChange={(e) => onChange({ ...doc, url: e.target.value })}
          placeholder="or paste URL…"
          className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>
      {uploading && (
        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {doc.url && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 flex items-center gap-1"><Check size={10} /> File set</span>
          <input
            value={doc.size}
            onChange={(e) => onChange({ ...doc, size: e.target.value })}
            placeholder="Size (e.g. 2.1 MB)"
            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-gray-400 text-xs focus:outline-none focus:border-gray-500 w-28"
          />
        </div>
      )}
    </div>
  );
}

// ── Quiz Editor ────────────────────────────────────────────────────────────

function QuizEditor({ moduleId, defaultOpen = false }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(defaultOpen);
  const [newQ, setNewQ] = useState({ ...EMPTY_Q });
  const [editingQ, setEditingQ] = useState(null);
  const [savingQ, setSavingQ] = useState(false);

  const loadQuiz = () => {
    setLoading(true);
    api.quizzes()
      .then((all) => {
        const q = all.find((q) => q.moduleId === moduleId);
        setQuiz(q || null);
        if (q) return api.questions(q.id).then(setQuestions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) loadQuiz(); }, [moduleId, open]);

  const createQuiz = async () => {
    try {
      const q = await api.createQuiz({ moduleId, type: 'module', title: 'Module Quiz', passingScore: 70 });
      setQuiz(q); setQuestions([]);
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
        <span>Quiz Questions</span>
        {quiz
          ? <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 text-xs border border-emerald-800/40">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          : <span className="px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 text-xs border border-amber-800/30">no quiz yet</span>
        }
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {loading && <p className="text-gray-500 text-sm animate-pulse">Loading quiz…</p>}

          {!loading && !quiz && (
            <div className="bg-amber-900/10 border border-amber-700/30 rounded-xl p-4">
              <p className="text-amber-300 text-sm mb-3">No quiz yet. Users can't complete this module until a quiz exists.</p>
              <button onClick={createQuiz}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition">
                <Plus size={14} /> Create Quiz
              </button>
            </div>
          )}

          {!loading && quiz && (
            <>
              {questions.length === 0 && (
                <p className="text-amber-400 text-xs flex items-center gap-1">
                  <Info size={12} /> Add at least one question so users can complete this module.
                </p>
              )}

              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="text-gray-500 text-xs mt-1 shrink-0 w-5 text-right font-mono">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-emerald-400 text-xs">✓ {Array.isArray(q.options) ? q.options[q.answerIndex] : JSON.parse(q.options)[q.answerIndex]}</span>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-gray-500 text-xs">{q.points} pts</span>
                        {q.explanation && <span className="text-gray-600 text-xs italic truncate max-w-xs">{q.explanation}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingQ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options) })}
                        className="text-gray-400 hover:text-white p-1 transition"><Pencil size={13} /></button>
                      <button onClick={() => deleteQuestion(q.id)} className="text-gray-400 hover:text-red-400 p-1 transition"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                <h4 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  {editingQ ? <><Pencil size={11} /> Edit Question</> : <><Plus size={11} /> Add Question</>}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Question *</label>
                    <textarea rows={2} value={qForm.question} onChange={(e) => setQForm((f) => ({ ...f, question: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Answer options — select the correct one</label>
                    <div className="space-y-2">
                      {qForm.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setQForm((f) => ({ ...f, answerIndex: oi }))}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${qForm.answerIndex === oi ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600'}`}>
                            {qForm.answerIndex === oi && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                          </button>
                          <input value={opt} onChange={(e) => setQForm((f) => { const opts = [...f.options]; opts[oi] = e.target.value; return { ...f, options: opts }; })}
                            placeholder={`Option ${oi + 1}`}
                            className={`flex-1 bg-gray-900 border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none transition ${qForm.answerIndex === oi ? 'border-emerald-500/60' : 'border-gray-700 focus:border-gray-500'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Points</label>
                      <input type="number" min={1} value={qForm.points} onChange={(e) => setQForm((f) => ({ ...f, points: +e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Explanation <span className="text-gray-600">(optional)</span></label>
                      <input value={qForm.explanation} onChange={(e) => setQForm((f) => ({ ...f, explanation: e.target.value }))}
                        placeholder="Why is this the right answer?"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveQuestion} disabled={savingQ}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
                      <Check size={14} />{savingQ ? 'Saving…' : editingQ ? 'Update Question' : 'Add Question'}
                    </button>
                    {editingQ && (
                      <button onClick={() => setEditingQ(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-lg text-sm transition">
                        <X size={14} /> Cancel
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

// ── Module Form ────────────────────────────────────────────────────────────

function ModuleForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    const videos = Array.isArray(initial?.videos) && initial.videos.length > 0
      ? initial.videos.map(v => ({ ...EMPTY_VIDEO, ...v, id: v.id || tempId() }))
      : initial?.videoUrl
        ? [{ ...EMPTY_VIDEO, id: tempId(), title: initial.title || 'Chapter 1', url: initial.videoUrl, duration: initial.duration || '' }]
        : [];
    const documents = Array.isArray(initial?.documents)
      ? initial.documents.map(d => ({ ...d, id: d.id || tempId() }))
      : [];
    return {
      ...EMPTY, ...initial,
      thumbnailUrl: initial?.thumbnailUrl || '',
      videos,
      documents,
      _keyPointsRaw: Array.isArray(initial?.keyPoints) ? initial.keyPoints.join('\n') : '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(initial?.id || null);
  const [activeTab, setActiveTab] = useState('videos');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleTitleChange = (v) => {
    set('title', v);
    if (!initial?.id) set('slug', slugify(v));
  };

  const addVideo = () => set('videos', [...form.videos, { ...EMPTY_VIDEO, id: tempId() }]);
  const updateVideo = (i, v) => set('videos', form.videos.map((x, idx) => idx === i ? v : x));
  const removeVideo = (i) => set('videos', form.videos.filter((_, idx) => idx !== i));
  const moveVideo = (i, dir) => {
    const arr = [...form.videos];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set('videos', arr);
  };

  const addDoc = () => set('documents', [...form.documents, { ...EMPTY_DOC, id: tempId() }]);
  const updateDoc = (i, d) => set('documents', form.documents.map((x, idx) => idx === i ? d : x));
  const removeDoc = (i) => set('documents', form.documents.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const keyPoints = parseKeyPoints(form._keyPointsRaw);
      const cleanVideos = form.videos
        .filter(v => v.url)
        .map(v => ({ ...v, id: v.id || tempId(), transcript: Array.isArray(v.transcript) ? v.transcript : [] }));
      const cleanDocs = form.documents.filter(d => d.url).map(d => ({ ...d, id: d.id || tempId() }));
      const payload = {
        slug: form.slug, title: form.title, description: form.description,
        duration: form.duration, category: form.category, orderIndex: form.orderIndex,
        pointsValue: form.pointsValue, locked: form.locked,
        thumbnailUrl: form.thumbnailUrl || null,
        videoUrl: cleanVideos[0]?.url || '',
        videos: cleanVideos,
        documents: cleanDocs,
        keyPoints,
      };
      let mod;
      if (savedId) {
        mod = await api.updateModule(savedId, payload);
      } else {
        mod = await api.createModule(payload);
        await api.createQuiz({ moduleId: mod.id, type: 'module', title: `${mod.title} Quiz`, passingScore: 70 });
        setSavedId(mod.id);
        set('id', mod.id);
      }
      onSaved(mod, !savedId);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const TABS = [
    { key: 'videos', label: 'Videos', icon: Video, count: form.videos.length },
    { key: 'documents', label: 'Documents', icon: FileText, count: form.documents.length },
    { key: 'content', label: 'Content', icon: null },
  ];

  return (
    <div className="bg-gray-900 border border-emerald-600/30 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-semibold text-lg">{!savedId ? '✦ New Module' : `Edit: ${initial?.title}`}</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-white transition"><X size={18} /></button>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Title *</label>
          <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Introduction to HPV"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Slug * <span className="text-gray-600">(auto-filled)</span></label>
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)}
            placeholder="e.g. intro-to-hpv"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-gray-400 text-xs mb-1">Description *</label>
          <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="Brief summary shown on the modules list"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Total Duration</label>
          <input value={form.duration} onChange={(e) => set('duration', e.target.value)}
            placeholder="e.g. 25 min"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Points on completion</label>
          <input type="number" min={0} value={form.pointsValue} onChange={(e) => set('pointsValue', +e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Order <span className="text-gray-600">(0 = first)</span></label>
          <input type="number" min={0} value={form.orderIndex} onChange={(e) => set('orderIndex', +e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="button" onClick={() => set('locked', !form.locked)}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.locked ? 'bg-gray-700' : 'bg-emerald-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.locked ? 'left-0.5' : 'left-5'}`} />
          </button>
          <label className="text-gray-300 text-sm">
            {form.locked ? '🔒 Locked — requires previous module' : '🔓 Unlocked — accessible immediately'}
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-gray-400 text-xs mb-2">Thumbnail <span className="text-gray-600">(shown on the modules grid card)</span></label>
          <ThumbnailUploader value={form.thumbnailUrl || ''} onChange={(url) => set('thumbnailUrl', url)} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800 mb-5">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
              ${activeTab === key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}>
            {Icon && <Icon size={14} />}
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${activeTab === key ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Videos tab */}
      {activeTab === 'videos' && (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">
            Add one or more chapters. Each chapter has its own video, subtitles, and transcript.
            Students must watch ≥80% of each chapter to unlock the quiz.
          </p>
          {form.videos.map((v, i) => (
            <VideoRow
              key={v.id}
              video={v}
              index={i}
              total={form.videos.length}
              onChange={(updated) => updateVideo(i, updated)}
              onRemove={() => removeVideo(i)}
              onMoveUp={() => moveVideo(i, -1)}
              onMoveDown={() => moveVideo(i, 1)}
            />
          ))}
          <button type="button" onClick={addVideo}
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 border border-dashed border-emerald-800/50 hover:border-emerald-700 rounded-xl px-4 py-3 w-full justify-center transition">
            <Plus size={14} /> Add Chapter / Video
          </button>
          {form.videos.length === 0 && (
            <p className="text-amber-500 text-xs flex items-center gap-1"><Info size={12} /> Add at least one video for this module.</p>
          )}
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">Attach PDFs, slides, notes, or any downloadable resources for this module.</p>
          {form.documents.map((doc, i) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              index={i}
              onChange={(updated) => updateDoc(i, updated)}
              onRemove={() => removeDoc(i)}
            />
          ))}
          <button type="button" onClick={addDoc}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-900/50 hover:border-blue-800 rounded-xl px-4 py-3 w-full justify-center transition">
            <Plus size={14} /> Add Document / Resource
          </button>
        </div>
      )}

      {/* Content tab — key points only (transcripts moved to per-video) */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">
              Key Points <span className="text-gray-600">— one per line, shown as "Key Takeaways" in the player</span>
            </label>
            <textarea rows={6} value={form._keyPointsRaw}
              onChange={(e) => set('_keyPointsRaw', e.target.value)}
              placeholder={"Vaccines train the immune system\nHerd immunity protects the vulnerable\nModern vaccines undergo rigorous testing"}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono resize-y" />
            {form._keyPointsRaw && (
              <p className="text-gray-500 text-xs mt-1">{parseKeyPoints(form._keyPointsRaw).length} point(s)</p>
            )}
          </div>
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4">
            <p className="text-blue-300/70 text-xs flex items-start gap-1.5">
              <Info size={12} className="shrink-0 mt-0.5" />
              Subtitles &amp; transcripts are set per-chapter. Open the <strong className="text-blue-300">Videos</strong> tab, expand any chapter row, and click <strong className="text-blue-300">Subtitles &amp; Transcript</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
          <Check size={15} />{saving ? 'Saving…' : savedId ? 'Save Changes' : 'Create Module'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 text-gray-400 hover:text-white border border-gray-700 px-5 py-2.5 rounded-lg text-sm transition">
          <X size={15} /> Cancel
        </button>
        {savedId && <p className="text-gray-600 text-xs self-center ml-auto">ID: <span className="font-mono">{savedId}</span></p>}
      </div>

      {savedId && <QuizEditor moduleId={savedId} defaultOpen={!initial?.id} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const CAT_COLORS = {
  Foundations: 'text-blue-400 bg-blue-900/30 border-blue-800/30',
  HPV: 'text-violet-400 bg-violet-900/30 border-violet-800/30',
  MenB: 'text-rose-400 bg-rose-900/30 border-rose-800/30',
  Bonus: 'text-amber-400 bg-amber-900/30 border-amber-800/30',
  General: 'text-teal-400 bg-teal-900/30 border-teal-800/30',
};

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState(null);

  const load = () => api.modules().then((mods) => setModules(mods.sort((a, b) => a.orderIndex - b.orderIndex))).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleSaved = (mod, isNew) => {
    load();
    if (!isNew) setForm(null);
  };

  const del = async (id) => {
    if (!confirm('Delete this module and all associated progress/quizzes? This cannot be undone.')) return;
    await api.deleteModule(id);
    load();
  };

  const catColor = (cat) => CAT_COLORS[cat] || 'text-gray-400 bg-gray-800/30 border-gray-700/30';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Modules</h2>
          <p className="text-gray-500 text-sm mt-1">{modules.length} module{modules.length !== 1 ? 's' : ''} · manage chapters, documents, and quizzes</p>
        </div>
        <button onClick={() => setForm({})}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Add Module
        </button>
      </div>

      {form !== null && (
        <ModuleForm
          initial={form}
          onSaved={handleSaved}
          onCancel={() => setForm(null)}
        />
      )}

      {modules.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg font-medium text-gray-500 mb-2">No modules yet</p>
          <p className="text-sm">Click <strong className="text-white">Add Module</strong> to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => {
            const videos = Array.isArray(m.videos) && m.videos.length > 0 ? m.videos : m.videoUrl ? [{ url: m.videoUrl }] : [];
            const docs = Array.isArray(m.documents) ? m.documents : [];
            const transcriptCount = videos.reduce((sum, v) => sum + (Array.isArray(v.transcript) ? v.transcript.length : 0), 0);
            return (
              <div key={m.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-start gap-4 hover:border-gray-700 transition group">
                <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                  {m.orderIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold">{m.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${catColor(m.category)}`}>{m.category}</span>
                    {m.locked
                      ? <span className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 px-2 py-0.5 rounded-full">🔒 Locked</span>
                      : <span className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 px-2 py-0.5 rounded-full">🔓 Unlocked</span>
                    }
                  </div>
                  <p className="text-gray-500 text-sm truncate">{m.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 flex-wrap">
                    <span>{m.duration}</span>
                    <span>·</span>
                    <span className="text-emerald-500">{m.pointsValue} pts</span>
                    <span>·</span>
                    <span className={`flex items-center gap-1 ${videos.length > 0 ? 'text-blue-400' : 'text-amber-500'}`}>
                      <Video size={10} />
                      {videos.length > 0 ? `${videos.length} chapter${videos.length !== 1 ? 's' : ''}` : 'No chapters'}
                    </span>
                    {docs.length > 0 && (
                      <><span>·</span><span className="flex items-center gap-1 text-gray-500"><FileText size={10} />{docs.length} doc{docs.length !== 1 ? 's' : ''}</span></>
                    )}
                    {transcriptCount > 0 && (
                      <><span>·</span><span className="text-blue-500/70">{transcriptCount} transcript lines</span></>
                    )}
                    <span>·</span>
                    <span>{Array.isArray(m.keyPoints) ? m.keyPoints.length : 0} key points</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setForm({ ...m })}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg text-xs transition">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => del(m.id)}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-800/50 px-3 py-1.5 rounded-lg text-xs transition">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
