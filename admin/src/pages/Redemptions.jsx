import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Redemptions() {
  const [data, setData] = useState([]);
  useEffect(() => { api.redemptions().then(setData).catch(console.error); }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Redemption History</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Reward</th>
              <th className="px-4 py-3">Category</th><th className="px-4 py-3">Points Spent</th><th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3"><p className="text-white font-medium">{r.userName}</p><p className="text-gray-500 text-xs">{r.userEmail}</p></td>
                <td className="px-4 py-3 text-gray-300">{r.rewardTitle}</td>
                <td className="px-4 py-3 text-gray-400">{r.rewardCategory}</td>
                <td className="px-4 py-3 text-red-400 font-semibold">-{r.pointsSpent}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.redeemedAt).toLocaleString()}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No redemptions yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
