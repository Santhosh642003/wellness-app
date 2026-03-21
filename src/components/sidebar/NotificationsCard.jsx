import { useEffect, useState } from "react";
import { notifications as notificationsApi } from "../../lib/api";

export default function NotificationsCard() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.list()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="h-4 w-28 bg-slate-100 dark:bg-gray-800 rounded animate-pulse mb-3" />
        <div className="h-10 bg-slate-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📢</span>
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Announcements</h3>
        {items.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-3">No notifications</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id}
              className="rounded-xl border border-slate-100 dark:border-gray-800 overflow-hidden cursor-pointer hover:border-blue-400/30 dark:hover:border-blue-500/20 transition-colors"
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
            >
              {/* Image (if any) */}
              {n.imageUrl && (
                <div className="h-28 bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden">
                  <img
                    src={n.imageUrl}
                    alt={n.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white leading-snug">{n.title}</p>
                  <span className="text-slate-300 dark:text-gray-600 text-[10px] shrink-0 mt-0.5">
                    {expanded === n.id ? '▲' : '▼'}
                  </span>
                </div>
                {n.body && expanded === n.id && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1.5 leading-relaxed whitespace-pre-line">
                    {n.body}
                  </p>
                )}
                <p className="text-[10px] text-slate-300 dark:text-gray-600 mt-1.5">
                  {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
