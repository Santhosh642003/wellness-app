import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { api.user(id).then(setData).catch(console.error); }, [id]);
  if (!data) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
        <ArrowLeft size={16} /> Back to Users
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-600/20 border border-emerald-600/40 flex items-center justify-center text-emerald-400 font-bold text-xl">
            {data.initials}
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">{data.name}</h2>
            <p className="text-gray-400 text-sm">{data.email} · {data.role} · {data.campus}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-emerald-400 text-2xl font-bold">{data.progress?.points ?? 0}</p>
            <p className="text-gray-500 text-xs">points</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Section title="Module Progress">
          {data.moduleProgress?.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-300 text-sm">{m.title}</span>
              <span className={`text-xs font-semibold ${m.completed ? 'text-emerald-400' : 'text-gray-500'}`}>
                {m.completed ? '✓ Done' : `${m.watchedPercent}%`}
              </span>
            </div>
          ))}
        </Section>

        <Section title="Redemption History">
          {data.redemptions?.length === 0 && <p className="text-gray-500 text-sm">No redemptions yet</p>}
          {data.redemptions?.map(r => (
            <div key={r.id} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-300 text-sm">{r.title}</span>
              <span className="text-red-400 text-sm font-semibold">-{r.pointsSpent}pts</span>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Quiz Attempts">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 text-left"><th className="py-2">Type</th><th>Score</th><th>Passed</th><th>Date</th></tr></thead>
          <tbody>
            {data.quizAttempts?.map(q => (
              <tr key={q.id} className="border-t border-gray-800">
                <td className="py-2 text-gray-300">{q.quizType}</td>
                <td className="text-gray-400">{q.score}/{q.totalPoints}</td>
                <td>{q.passed ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}</td>
                <td className="text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
