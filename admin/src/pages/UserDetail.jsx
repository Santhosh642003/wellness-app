import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ArrowLeft, CheckCircle, XCircle, Flame, Plus, Minus, X, Star } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function AdjustPointsModal({ userId, currentPoints, onClose, onSuccess }) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (sign) => {
    const amount = parseInt(delta);
    if (!amount || amount <= 0) { setError('Enter a positive number'); return; }
    setSaving(true); setError('');
    try {
      const result = await api.adjustPoints(userId, sign * amount, reason);
      onSuccess(result.points);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Adjust Points</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Current balance: <span className="text-emerald-400 font-bold">{currentPoints.toLocaleString()} pts</span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Amount</label>
            <input type="number" min="1" value={delta} onChange={e => setDelta(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Reason (optional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Bonus for attendance"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => submit(1)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              <Plus size={14} /> Award
            </button>
            <button onClick={() => submit(-1)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              <Minus size={14} /> Deduct
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(0);

  useEffect(() => {
    api.user(id)
      .then(d => { setData(d); setCurrentPoints(d.progress?.points ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-5 w-32 bg-gray-800 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-red-400">User not found.</p>
      </div>
    );
  }

  const completedModules = data.moduleProgress?.filter(m => m.completed) ?? [];
  const passedQuizzes = data.quizAttempts?.filter(q => q.passed) ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Profile header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-full bg-emerald-600/20 border border-emerald-600/40 flex items-center justify-center text-emerald-400 font-bold text-xl shrink-0">
            {data.initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-xl font-bold">{data.name}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{data.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400">{data.role}</span>
              {data.campus && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{data.campus}</span>}
              {data.major && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{data.major}</span>}
              {data.yearOfStudy && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{data.yearOfStudy}</span>}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-5 flex-wrap shrink-0">
            {[
              { val: currentPoints.toLocaleString(), label: 'points', color: 'text-emerald-400' },
              { val: (data.progress?.streakDays ?? 0) > 0 ? `🔥 ${data.progress.streakDays}d` : '—', label: 'streak', color: 'text-yellow-400' },
              { val: completedModules.length, label: 'modules done', color: 'text-purple-400' },
              { val: passedQuizzes.length, label: 'quizzes passed', color: 'text-blue-400' },
            ].map(({ val, label, color }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-bold ${color}`}>{val}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-800">
          <button onClick={() => setShowPointsModal(true)}
            className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Star size={14} /> Adjust Points
          </button>
          {data.progress?.lastClaimDate && (
            <span className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm">
              <Flame size={13} className="text-orange-400" />
              Last active {new Date(data.progress.lastClaimDate).toLocaleDateString()}
            </span>
          )}
          <span className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-500 px-4 py-2 rounded-lg text-sm">
            Joined {new Date(data.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Module Progress */}
        <Section title={`Module Progress (${completedModules.length}/${data.moduleProgress?.length ?? 0} completed)`}>
          {data.moduleProgress?.length === 0 ? (
            <p className="text-gray-500 text-sm">No module activity yet</p>
          ) : (
            <div className="space-y-3">
              {data.moduleProgress?.map(m => (
                <div key={m.moduleId || m.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-xs font-medium truncate flex-1 mr-2">{m.title}</span>
                    <span className={`text-xs font-semibold shrink-0 ${m.completed ? 'text-emerald-400' : m.watchedPercent > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                      {m.completed ? '✓ Done' : m.watchedPercent > 0 ? `${m.watchedPercent}%` : 'Not started'}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${m.completed ? 100 : (m.watchedPercent || 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Redemption History */}
        <Section title={`Redemptions (${data.redemptions?.length ?? 0})`}>
          {data.redemptions?.length === 0 ? (
            <p className="text-gray-500 text-sm">No redemptions yet</p>
          ) : (
            <div className="space-y-1">
              {data.redemptions?.map(r => (
                <div key={r.id} className="flex justify-between items-start py-2 border-b border-gray-800/60 last:border-0">
                  <div>
                    <p className="text-gray-300 text-sm">{r.title}</p>
                    <p className="text-gray-600 text-xs">{new Date(r.redeemedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-red-400 text-sm font-semibold shrink-0 ml-3">−{r.pointsSpent} pts</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Quiz Attempts */}
      <Section title={`Quiz Attempts (${data.quizAttempts?.length ?? 0})`}>
        {data.quizAttempts?.length === 0 ? (
          <p className="text-gray-500 text-sm">No quiz attempts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs text-left border-b border-gray-800">
                  <th className="pb-2 pr-4">Quiz Type</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">%</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.quizAttempts?.map(q => {
                  const pct = q.totalPoints > 0 ? Math.round((q.score / q.totalPoints) * 100) : 0;
                  return (
                    <tr key={q.id} className="border-t border-gray-800/50">
                      <td className="py-2.5 pr-4 text-gray-300 capitalize">{q.quizType || 'module'}</td>
                      <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs">{q.score}/{q.totalPoints}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-bold ${pct >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {q.passed
                          ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle size={13} /> Passed</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={13} /> Failed</span>
                        }
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">{new Date(q.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {showPointsModal && (
        <AdjustPointsModal
          userId={id}
          currentPoints={currentPoints}
          onClose={() => setShowPointsModal(false)}
          onSuccess={(newPts) => { setCurrentPoints(newPts); setShowPointsModal(false); }}
        />
      )}
    </div>
  );
}
