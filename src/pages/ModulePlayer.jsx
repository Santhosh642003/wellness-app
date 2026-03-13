import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { MODULE_CONTENT } from "../data/moduleContent";
import { INITIAL, safeLoad, safeSave } from "../store/dashboardStore";

const CATEGORY_COLORS = {
  Foundations: "bg-blue-400/10 border-blue-400/20 text-blue-300",
  HPV: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300",
  MenB: "bg-purple-400/10 border-purple-400/20 text-purple-300",
  Bonus: "bg-yellow-400/10 border-yellow-400/20 text-yellow-300",
};

export default function ModulePlayer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(INITIAL);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [iframePlaying, setIframePlaying] = useState(false);
  const captionIntervalRef = useRef(null);
  const simulatedTimeRef = useRef(0);

  // Load dashboard state for progress/nav
  useEffect(() => {
    const loaded = safeLoad();
    if (loaded) {
      setData((prev) => ({
        ...prev,
        ...loaded,
        user: { ...prev.user, ...(loaded.user || {}) },
        modules: Array.isArray(loaded.modules) ? loaded.modules : prev.modules,
      }));
    }
  }, []);

  const content = useMemo(
    () => MODULE_CONTENT[moduleId] || MODULE_CONTENT["m1"],
    [moduleId]
  );

  const modules = data.modules || [];
  const currentIdx = modules.findIndex((m) => m.id === moduleId);
  const currentModule = modules[currentIdx] || null;
  const nextModule = modules[currentIdx + 1] || null;
  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;

  // Active caption line: find the latest transcript entry whose time <= videoTime
  const activeCaptionIdx = useMemo(() => {
    const entries = content.transcript;
    let idx = -1;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].time <= videoTime) idx = i;
    }
    return idx;
  }, [videoTime, content.transcript]);

  const activeCaption = activeCaptionIdx >= 0 ? content.transcript[activeCaptionIdx] : null;

  // Simulate video time advancing when iframePlaying (since we can't read YouTube's currentTime)
  const togglePlay = useCallback(() => {
    if (iframePlaying) {
      setIframePlaying(false);
      if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);
    } else {
      setIframePlaying(true);
      captionIntervalRef.current = setInterval(() => {
        simulatedTimeRef.current += 1;
        setVideoTime(simulatedTimeRef.current);
      }, 1000);
    }
  }, [iframePlaying]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);
    };
  }, []);

  const resetCaptions = () => {
    simulatedTimeRef.current = 0;
    setVideoTime(0);
    setIframePlaying(false);
    if (captionIntervalRef.current) clearInterval(captionIntervalRef.current);
  };

  // Mark progress when navigating to quiz
  const goToQuiz = () => {
    // Update module progress to reflect watched
    setData((prev) => {
      const modules = prev.modules.map((m) => {
        if (m.id !== moduleId) return m;
        const newProgress = Math.max(m.progress || 0, 0.8);
        return { ...m, progress: newProgress };
      });
      const next = { ...prev, modules };
      safeSave(next);
      return next;
    });
    navigate(`/quiz/module/${moduleId}`);
  };

  const categoryColor =
    CATEGORY_COLORS[content.category] ||
    "bg-gray-400/10 border-gray-400/20 text-gray-300";

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav
        points={data.points || 0}
        streakDays={data.streakDays || 0}
        initials={data.user?.initials || "SN"}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/modules")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Modules
        </button>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-xs px-3 py-1 rounded-full border font-medium ${categoryColor}`}>
              {content.category}
            </span>
            <span className="text-xs text-gray-500">{content.duration}</span>
          </div>
          <h1 className="text-3xl font-semibold">{content.title}</h1>
          <p className="text-gray-400 mt-2">{content.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Video + Captions */}
          <section className="lg:col-span-8 space-y-4">
            {/* Video Player */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black relative">
                <iframe
                  key={moduleId}
                  src={`https://www.youtube.com/embed/${content.youtubeId}?rel=0&modestbranding=1`}
                  title={content.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Caption controls bar */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setCaptionsOn((v) => !v);
                      if (!iframePlaying && !captionsOn) togglePlay();
                    }}
                    className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      captionsOn
                        ? "bg-blue-500/20 border-blue-400/30 text-blue-300"
                        : "bg-[#1a1a1a] border-gray-700 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    {captionsOn ? "Captions ON" : "Live Captions"}
                  </button>

                  {captionsOn && (
                    <>
                      <button
                        onClick={togglePlay}
                        className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-700 bg-[#1a1a1a]"
                      >
                        {iframePlaying ? "⏸ Pause captions" : "▶ Sync captions"}
                      </button>
                      <button
                        onClick={resetCaptions}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Reset
                      </button>
                    </>
                  )}
                </div>

                <span className="text-xs text-gray-600">
                  {iframePlaying
                    ? `${Math.floor(videoTime / 60)}:${String(videoTime % 60).padStart(2, "0")}`
                    : "sync with video"}
                </span>
              </div>
            </div>

            {/* Live Caption Display */}
            {captionsOn && (
              <div className="bg-[#0d1117] border border-blue-500/20 rounded-2xl p-5 min-h-[80px] flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2 w-2 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${iframePlaying ? "bg-blue-400" : "bg-gray-600"}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${iframePlaying ? "bg-blue-500" : "bg-gray-600"}`} />
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {iframePlaying ? "Live Captions" : "Captions paused"}
                  </span>
                </div>
                {activeCaption ? (
                  <p className="text-white text-base leading-relaxed font-medium">
                    {activeCaption.text}
                  </p>
                ) : (
                  <p className="text-gray-600 text-sm italic">
                    {iframePlaying ? "Waiting for captions..." : "Press 'Sync captions' then play the video"}
                  </p>
                )}
                {/* Caption progress dots */}
                <div className="flex gap-1 mt-3 flex-wrap">
                  {content.transcript.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i < activeCaptionIdx
                          ? "w-4 bg-blue-500/60"
                          : i === activeCaptionIdx
                          ? "w-6 bg-blue-400"
                          : "w-2 bg-gray-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Key Points */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Key Takeaways
              </h2>
              <ul className="space-y-3">
                {content.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Full Transcript */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Full Transcript</h2>
              <div className="space-y-3 text-sm leading-relaxed max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {content.transcript.map((line, idx) => {
                  const mins = Math.floor(line.time / 60);
                  const secs = String(line.time % 60).padStart(2, "0");
                  const isActive = idx === activeCaptionIdx && captionsOn;
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 p-2 rounded-xl transition-colors ${
                        isActive ? "bg-blue-500/10 border border-blue-500/20" : ""
                      }`}
                    >
                      <span className="text-gray-600 font-mono text-xs mt-0.5 shrink-0 w-12">
                        [{mins}:{secs}]
                      </span>
                      <span className={isActive ? "text-white font-medium" : "text-gray-400"}>
                        {line.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={goToQuiz}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 hover:opacity-90 transition"
              >
                Take Module Quiz
              </button>
              <button
                onClick={() => navigate("/modules")}
                className="px-6 py-3 rounded-xl font-semibold bg-[#141414] border border-gray-800 hover:bg-[#171717]"
              >
                All Modules
              </button>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Progress Card */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold mb-1">Your Progress</div>
              <div className="text-xs text-gray-500">Keep going! You're doing great</div>

              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-semibold">{completedCount}/{totalCount}</div>
                <div className="text-xs text-gray-500">Modules Completed</div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">
                  {Math.round((completedCount / Math.max(totalCount, 1)) * 100)}% complete
                </div>
                <div className="h-2 rounded-full bg-[#0f0f0f] border border-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
                    style={{ width: `${Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {currentModule && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">This module</div>
                  <div className="h-1.5 rounded-full bg-[#0f0f0f] border border-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.round((currentModule.progress || 0) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {Math.round((currentModule.progress || 0) * 100)}% watched
                  </div>
                </div>
              )}
            </div>

            {/* Next Module */}
            {nextModule && (
              <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5">
                <div className="text-sm font-semibold mb-3">Up Next</div>
                <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400 font-medium mb-1">{nextModule.title}</div>
                  <div className="text-[11px] text-gray-600 leading-relaxed">{nextModule.desc}</div>
                  {!nextModule.locked ? (
                    <button
                      onClick={() => navigate(`/modules/${nextModule.id}`)}
                      className="mt-4 w-full px-4 py-2 rounded-xl text-sm font-semibold bg-[#1a1a1a] border border-gray-800 hover:bg-[#1f1f1f]"
                    >
                      Start Module
                    </button>
                  ) : (
                    <div className="mt-4 text-xs text-gray-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Complete this module to unlock
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Points for this module */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold mb-3">Completion Reward</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Points earned on completion</div>
                <span className="text-lg font-bold text-yellow-300">+{content.points}</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Pass the quiz to unlock the next module
              </div>
            </div>

            {/* Caption tip */}
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <div>
                  <div className="text-xs font-semibold text-blue-300 mb-1">Live Captions</div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    Click "Live Captions" below the video, then press "Sync captions" when you start playing to follow along in real time.
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
