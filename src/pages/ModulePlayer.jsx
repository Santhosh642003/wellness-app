import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { MODULE_CONTENT } from "../data/moduleContent";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi, users as usersApi } from "../lib/api";

// Map backend module orderIndex → MODULE_CONTENT key
const ORDER_TO_KEY = ["m1", "m2", "m3", "m4", "m5", "m6"];

function getContent(mod) {
  if (!mod) return MODULE_CONTENT["m1"];
  if (MODULE_CONTENT[mod.slug]) return MODULE_CONTENT[mod.slug];
  const key = ORDER_TO_KEY[mod.orderIndex] || "m1";
  return MODULE_CONTENT[key] || MODULE_CONTENT["m1"];
}

export default function ModulePlayer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mod, setMod] = useState(null);
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    Promise.all([
      modulesApi.get(moduleId),
      modulesApi.list(),
    ]).then(([m, all]) => {
      setMod(m);
      setAllModules(all);
    }).catch(console.error).finally(() => setLoading(false));
  }, [moduleId]);

  const content = useMemo(() => getContent(mod), [mod]);

  const modules = allModules;
  const currentIdx = modules.findIndex((m) => m.id === moduleId);
  const nextModule = modules[currentIdx + 1] || null;
  const completedCount = modules.filter((m) => m.userProgress?.completed).length;

  const activeCaptionIdx = useMemo(() => {
    if (!content.transcript) return -1;
    let idx = -1;
    for (let i = 0; i < content.transcript.length; i++) {
      if (content.transcript[i].time <= videoTime) idx = i;
    }
    return idx;
  }, [videoTime, content.transcript]);

  const activeCaption = activeCaptionIdx >= 0 ? content.transcript[activeCaptionIdx] : null;

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setVideoTime(Math.floor(videoRef.current.currentTime));
    }
  }, []);

  const saveProgress = useCallback(async (watchedPercent) => {
    if (!user?.id || !moduleId) return;
    try {
      await usersApi.updateModuleProgress(user.id, moduleId, { watchedPercent });
    } catch (err) {
      console.error("Failed to save progress", err);
    }
  }, [user?.id, moduleId]);

  const goToQuiz = async () => {
    await saveProgress(80);
    navigate(`/quiz/module/${moduleId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-[var(--text-muted)] animate-pulse">Loading module…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav initials={user?.initials || "SN"} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <button onClick={() => navigate("/modules")} className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300 mb-6 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Modules
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs px-3 py-1 rounded-full border bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 font-medium">
              {content.category || mod?.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-gray-500">{content.duration || mod?.duration}</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{mod?.title || content.title}</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2">{mod?.description || content.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-4">
            {/* Video */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black">
                <video
                  ref={videoRef}
                  key={moduleId}
                  src={content.videoUrl}
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full"
                  preload="metadata"
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>

              {/* Caption Controls */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-slate-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCaptionsOn((v) => !v)}
                    className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${captionsOn ? "bg-blue-500/10 border-blue-400/30 text-blue-500 dark:text-blue-300" : "bg-slate-100 dark:bg-[#1a1a1a] border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    {captionsOn ? "Captions ON" : "Live Captions"}
                  </button>
                </div>
                <span className="text-xs text-slate-400 dark:text-gray-600">
                  {`${Math.floor(videoTime / 60)}:${String(videoTime % 60).padStart(2, "0")}`}
                </span>
              </div>
            </div>

            {/* Live Caption Display */}
            {captionsOn && (
              <div className="bg-blue-50 dark:bg-[#0d1117] border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 min-h-[80px] flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">Live Captions</span>
                </div>
                {activeCaption ? (
                  <p className="text-slate-900 dark:text-white text-base leading-relaxed font-medium">{activeCaption.text}</p>
                ) : (
                  <p className="text-slate-400 dark:text-gray-600 text-sm italic">Play the video to see captions…</p>
                )}
                <div className="flex gap-1 mt-3 flex-wrap">
                  {(content.transcript || []).map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i < activeCaptionIdx ? "w-4 bg-blue-400/60" : i === activeCaptionIdx ? "w-6 bg-blue-500" : "w-2 bg-slate-200 dark:bg-gray-800"}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Key Points */}
            {content.keyPoints && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-300 uppercase tracking-wider mb-4">Key Takeaways</h2>
                <ul className="space-y-3">
                  {content.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-gray-300">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-500 text-xs font-bold mt-0.5">{i + 1}</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transcript */}
            {content.transcript && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Full Transcript</h2>
                <div className="space-y-3 text-sm leading-relaxed max-h-80 overflow-y-auto pr-2">
                  {content.transcript.map((line, idx) => {
                    const mins = Math.floor(line.time / 60);
                    const secs = String(line.time % 60).padStart(2, "0");
                    const isActive = idx === activeCaptionIdx && captionsOn;
                    return (
                      <div key={idx} className={`flex gap-3 p-2 rounded-xl transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20" : ""}`}>
                        <span className="text-slate-400 dark:text-gray-600 font-mono text-xs mt-0.5 shrink-0 w-12">[{mins}:{secs}]</span>
                        <span className={isActive ? "text-slate-900 dark:text-white font-medium" : "text-slate-500 dark:text-gray-400"}>{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <button onClick={goToQuiz} className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition">Take Module Quiz</button>
              <button onClick={() => navigate("/modules")} className="px-6 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#171717]">All Modules</button>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Your Progress</div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-semibold text-slate-900 dark:text-white">{completedCount}/{modules.length}</div>
                <div className="text-xs text-slate-400 dark:text-gray-500">Modules</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${Math.round((completedCount / Math.max(modules.length, 1)) * 100)}%` }} />
              </div>
            </div>

            {nextModule && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Up Next</div>
                <div className="bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-700 dark:text-gray-400 mb-1">{nextModule.title}</div>
                  <div className="text-[11px] text-slate-400 dark:text-gray-600">{nextModule.description}</div>
                  {!nextModule.locked ? (
                    <button onClick={() => navigate(`/modules/${nextModule.id}`)} className="mt-3 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#1f1f1f]">Start</button>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400 dark:text-gray-600">🔒 Complete this module first</div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Completion Reward</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 dark:text-gray-500">Points on completion</div>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-300">+{mod?.pointsValue || content.points}</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/15 rounded-2xl p-5">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-300 mb-1">Live Captions</div>
              <div className="text-xs text-slate-500 dark:text-gray-500 leading-relaxed">
                Click "Live Captions" below the video, then play to follow along with synced captions in real time.
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
