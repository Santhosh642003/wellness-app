import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import VideoPlayer from "../components/VideoPlayer";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi, users as usersApi, comments as commentsApi } from "../lib/api";

const FILE_ICONS = {
  pdf: "📄", docx: "📝", doc: "📝", pptx: "📊", ppt: "📊",
  xlsx: "📊", xls: "📊", mp4: "🎬", zip: "📦", default: "📎",
};
function fileIcon(type) { return FILE_ICONS[type?.toLowerCase()] || FILE_ICONS.default; }

function getContent(mod) {
  // Build canonical videos list: prefer mod.videos array, fall back to single videoUrl
  const rawVideos = Array.isArray(mod?.videos) && mod.videos.length > 0
    ? mod.videos
    : mod?.videoUrl
      ? [{ id: "v0", title: mod.title || "Video", url: mod.videoUrl, duration: mod.duration || "" }]
      : [];

  return {
    title: mod?.title ?? "",
    subtitle: mod?.description ?? "",
    category: mod?.category ?? "",
    duration: mod?.duration ?? "",
    points: mod?.pointsValue ?? 0,
    videos: rawVideos,
    documents: Array.isArray(mod?.documents) ? mod.documents : [],
    keyPoints: mod?.keyPoints ?? [],
  };
}

export default function ModulePlayer() {
  const { moduleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mod, setMod] = useState(null);
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  // Multi-video state
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [videoProgress, setVideoProgress] = useState({}); // { "0": pct, "1": pct, ... }

  // Video progress (for current video)
  const [videoTime, setVideoTime] = useState(0);
  const [watchedPercent, setWatchedPercent] = useState(0);
  const videoRef = useRef(null);
  const lastSavedPct = useRef(0);
  const saveTimer = useRef(null);

  // Per-video playback timestamps in seconds — { "0": 482, "1": 120 }
  // Stored in a ref so handleTimeUpdate can update it without triggering re-renders.
  const videoTimestampsRef = useRef({});
  // Mirror of watchedPercent kept in a ref for use in stable event listeners.
  const watchedPercentRef = useRef(0);
  // Stable ref to the latest saveProgress so the pause listener never re-registers.
  const saveProgressRef = useRef(null);

  // Anti-seek-exploit: track the furthest position (seconds) reached via genuine playback,
  // keyed by video index. Progress and quiz unlock are derived from this, not currentTime.
  const furthestWatchedRef = useRef({});
  // Previous currentTime per video — used to detect large forward jumps (seeks) in timeupdate.
  const prevVideoTimeRef = useRef({});

  const [lastSaved, setLastSaved] = useState(null);

  // Caption state
  const [captionsOn, setCaptionsOn] = useState(false);

  // Discussion state
  const [discussionComments, setDiscussionComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentPosting, setCommentPosting] = useState(false);

  // Load module data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      modulesApi.get(moduleId),
      modulesApi.list(),
      user?.id ? usersApi.get(user.id) : Promise.resolve(null),
    ])
      .then(([m, all, userData]) => {
        setMod(m);
        setAllModules(all);
        if (userData?.progress) {
          setPoints(userData.progress.points || 0);
          setStreakDays(userData.progress.streakDays || 0);
        }
        // Restore saved per-video progress
        const savedVP = m?.userProgress?.videoProgress || {};
        const savedVT = m?.userProgress?.videoTimestamps || {};
        setVideoProgress(savedVP);
        videoTimestampsRef.current = savedVT;

        // Start at the chapter requested via ?chapter=N, default 0
        const chapterParam = parseInt(searchParams.get("chapter") || "0");
        const numVideos = (Array.isArray(m?.videos) && m.videos.length > 0 ? m.videos.length : m?.videoUrl ? 1 : 1);
        const safeIdx = Math.max(0, Math.min(chapterParam, numVideos - 1));
        setCurrentVideoIdx(safeIdx);

        const savedPct = savedVP[String(safeIdx)] ?? (safeIdx === 0 ? m?.userProgress?.watchedPercent ?? 0 : 0);
        setWatchedPercent(savedPct);
        watchedPercentRef.current = savedPct;
        lastSavedPct.current = savedPct;
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [moduleId, user?.id]);

  const content = useMemo(() => getContent(mod), [mod]);
  const currentVideoUrl = content.videos[currentVideoIdx]?.url || "";
  const currentVideoTitle = content.videos[currentVideoIdx]?.title || "";

  const currentIdx = allModules.findIndex((m) => m.id === moduleId);
  const nextModule = allModules[currentIdx + 1] || null;
  const completedCount = allModules.filter((m) => m.userProgress?.completed).length;
  const alreadyCompleted = mod?.userProgress?.completed ?? false;
  const quizPassed = mod?.userProgress?.quizPassed ?? false;

  // All videos must be >= 80% watched to unlock quiz
  const allVideosWatched = content.videos.length === 0 || content.videos.every((_, i) => (videoProgress[String(i)] ?? 0) >= 80);
  const quizUnlocked = alreadyCompleted || quizPassed || (content.videos.length > 0 ? allVideosWatched : watchedPercent >= 80);

  // Save progress to the server
  const saveProgress = useCallback(async (pct, vpOverride) => {
    if (!user?.id || !moduleId) return;
    try {
      const vp = vpOverride ?? videoProgress;
      const vt = { ...videoTimestampsRef.current };
      await usersApi.updateModuleProgress(user.id, moduleId, {
        watchedPercent: Math.round(pct),
        videoProgress: content.videos.length > 1 ? vp : undefined,
        videoTimestamps: Object.keys(vt).length > 0 ? vt : undefined,
      });
      lastSavedPct.current = pct;
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save progress", err);
    }
  }, [user?.id, moduleId, videoProgress, content.videos.length]);

  // Keep saveProgressRef current so the stable pause listener always calls the latest version
  useEffect(() => { saveProgressRef.current = saveProgress; });

  // Save every 10 seconds if progress advanced
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (watchedPercentRef.current > lastSavedPct.current + 1) {
        saveProgressRef.current?.(watchedPercentRef.current);
      }
    }, 10000);
    return () => clearInterval(saveTimer.current);
  }, []); // stable — reads from refs, no deps needed

  // Save on unmount
  useEffect(() => {
    return () => {
      if (watchedPercentRef.current > lastSavedPct.current + 1) {
        saveProgressRef.current?.(watchedPercentRef.current);
      }
    };
  }, []); // stable — refs always current

  // Save on pause (registered once; uses stable refs)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPause = () => {
      if (watchedPercentRef.current > lastSavedPct.current + 1) {
        saveProgressRef.current?.(watchedPercentRef.current);
      }
    };
    video.addEventListener('pause', onPause);
    return () => video.removeEventListener('pause', onPause);
  }, []); // stable — only registered once on mount

  // Track video time and accumulate genuine watch progress.
  // Progress is driven by furthestWatchedRef — the furthest position reached via continuous
  // playback — not by currentTime. Large forward jumps in currentTime (seeks) don't count.
  const handleTimeUpdate = useCallback((currentTime) => {
    setVideoTime(Math.floor(currentTime));
    const key = String(currentVideoIdx);
    videoTimestampsRef.current[key] = Math.floor(currentTime);

    const dur = videoRef.current?.duration;
    if (dur > 0) {
      const prev = prevVideoTimeRef.current[key] ?? currentTime;
      const delta = currentTime - prev;
      // timeupdate fires ~4 times/sec; anything ≤ 1.5s forward is natural playback.
      // Backward delta is fine (rewinding). Only large positive jumps indicate a seek.
      const isNaturalPlayback = delta >= 0 && delta <= 1.5;
      if (isNaturalPlayback) {
        furthestWatchedRef.current[key] = Math.max(
          furthestWatchedRef.current[key] ?? 0,
          currentTime
        );
      }

      // Derive progress exclusively from the furthest genuine position
      const watchedPct = Math.min(100, ((furthestWatchedRef.current[key] ?? 0) / dur) * 100);
      const newPct = Math.max(watchedPercentRef.current, watchedPct);
      watchedPercentRef.current = newPct;
      setWatchedPercent(newPct);
      setVideoProgress((prev) => {
        if (watchedPct <= (prev[key] ?? 0)) return prev;
        return { ...prev, [key]: Math.round(watchedPct) };
      });
    }
    prevVideoTimeRef.current[key] = currentTime;
  }, [currentVideoIdx]);

  // On video ended: mark current video 100% and clear its resume timestamp.
  // Guard: only count as genuine completion if the furthest-watched position is ≥70%
  // of duration, so a seek-to-end that triggers the ended event cannot farm completion.
  const handleVideoEnded = useCallback(() => {
    const key = String(currentVideoIdx);
    const dur = videoRef.current?.duration;
    const furthest = furthestWatchedRef.current[key] ?? 0;
    if (dur > 0 && furthest < dur * 0.70) return; // seek-to-end — ignore

    // Mark full watch for this video
    if (dur > 0) furthestWatchedRef.current[key] = dur;
    watchedPercentRef.current = 100;
    setWatchedPercent(100);
    // Clear the timestamp so replaying a completed video starts from the beginning
    delete videoTimestampsRef.current[key];
    setVideoProgress((prev) => {
      const updated = { ...prev, [key]: 100 };
      const percs = Object.values(updated);
      const avg = Math.round(percs.reduce((a, b) => a + b, 0) / Math.max(percs.length, 1));
      saveProgress(avg, updated);
      // Auto-advance to next video
      if (currentVideoIdx < content.videos.length - 1) {
        setTimeout(() => setCurrentVideoIdx((i) => i + 1), 1200);
      }
      return updated;
    });
  }, [saveProgress, currentVideoIdx, content.videos.length]);

  // Seek to saved position when video metadata loads.
  // Initialises furthestWatchedRef from saved progress FIRST so the resume seek that
  // immediately follows doesn't get snapped back by handleSeeked.
  const handleMetadataLoaded = useCallback(() => {
    const dur = videoRef.current?.duration;
    if (!dur || dur <= 0) return;
    const key = String(currentVideoIdx);
    const savedPct = videoProgress[key] ?? 0;

    // Restore furthest-watched so seek restriction reflects previously-earned progress.
    // Only initialise once per video load; don't overwrite accrued watch time on remount.
    if (furthestWatchedRef.current[key] === undefined) {
      furthestWatchedRef.current[key] = (savedPct / 100) * dur;
    }

    const savedTs = videoTimestampsRef.current[key];
    if (savedTs !== undefined && savedTs > 0 && savedTs < dur * 0.95) {
      videoRef.current.currentTime = savedTs;
    } else if (savedPct > 0 && savedPct < 95) {
      videoRef.current.currentTime = (savedPct / 100) * dur;
    }
  }, [currentVideoIdx, videoProgress]);

  // When user switches videos, save current chapter then restore state for new chapter
  const switchVideo = useCallback((idx) => {
    const percs = Object.values(videoProgress);
    const avg = percs.length ? Math.round(percs.reduce((a, b) => a + b, 0) / percs.length) : 0;
    if (watchedPercentRef.current > lastSavedPct.current + 1) saveProgress(avg);
    setCurrentVideoIdx(idx);
    const savedPct = videoProgress[String(idx)] ?? 0;
    setWatchedPercent(savedPct);
    watchedPercentRef.current = savedPct;
    lastSavedPct.current = savedPct;
    setVideoTime(0);
  }, [videoProgress, saveProgress]);

  // Per-video transcript (updates when current chapter changes)
  const currentTranscript = useMemo(
    () => Array.isArray(content.videos[currentVideoIdx]?.transcript) ? content.videos[currentVideoIdx].transcript : [],
    [content.videos, currentVideoIdx]
  );

  // Preset captions
  const activeCaptionIdx = useMemo(() => {
    if (!currentTranscript.length) return -1;
    let idx = -1;
    for (let i = 0; i < currentTranscript.length; i++) {
      if (currentTranscript[i].time <= videoTime) idx = i;
    }
    return idx;
  }, [videoTime, currentTranscript]);

  // Null out overlay once video time passes the cue's endTime (prevents last cue staying on screen forever)
  const activeCaption = useMemo(() => {
    if (activeCaptionIdx < 0) return null;
    const cue = currentTranscript[activeCaptionIdx];
    if (cue.endTime !== undefined && videoTime > cue.endTime) return null;
    return cue;
  }, [activeCaptionIdx, currentTranscript, videoTime]);

  // Snap back any seek that jumps beyond the furthest genuinely-watched position.
  // A 3-second buffer accounts for minor decode/buffering drift; backward seeks are always free.
  const handleSeeked = useCallback(() => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const key = String(currentVideoIdx);
    const furthest = furthestWatchedRef.current[key];
    if (furthest === undefined) return; // metadata not yet loaded
    const BUFFER_SEC = 3;
    if (v.currentTime > furthest + BUFFER_SEC) {
      v.currentTime = Math.max(0, furthest);
    }
  }, [currentVideoIdx]);

  // Fraction of the video the user may seek to (0–1).
  // For completed modules allow free seeking everywhere; otherwise cap at furthest watched + buffer.
  const maxSeekFraction = useMemo(() => {
    if (alreadyCompleted) return 1;
    const key = String(currentVideoIdx);
    const dur = videoRef.current?.duration;
    if (!dur) return 0;
    const furthest = furthestWatchedRef.current[key] ?? 0;
    return Math.min(1, (furthest + 3) / dur);
  // videoTime re-evaluates this on every timeupdate so the seek bar marker stays current
  }, [currentVideoIdx, videoTime, alreadyCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToQuiz = () => navigate(`/quiz/module/${moduleId}`);

  // Chapters still under the 80% watch threshold (used for the quiz lock message)
  const incompleteChapters = content.videos
    .map((v, i) => ({ v, i, pct: videoProgress[String(i)] ?? 0 }))
    .filter(({ pct }) => pct < 80);

  // Load comments
  useEffect(() => {
    if (!moduleId) return;
    setCommentLoading(true);
    commentsApi.list(moduleId)
      .then((data) => setDiscussionComments(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setCommentLoading(false));
  }, [moduleId]);

  const postComment = async () => {
    const body = commentInput.trim();
    if (!body || commentPosting) return;
    setCommentPosting(true);
    try {
      const newComment = await commentsApi.add(moduleId, body);
      setDiscussionComments((prev) => [...prev, newComment]);
      setCommentInput("");
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setCommentPosting(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await commentsApi.delete(moduleId, commentId);
      setDiscussionComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-slate-400 animate-pulse">Loading module…</div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-red-400">Module not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <DashboardNav points={points} streakDays={streakDays} initials={user?.initials || "?"} avatarUrl={user?.avatarUrl} />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <button
          onClick={() => navigate("/modules")}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Modules
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full border bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 font-medium">
              {content.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-gray-500">{content.duration}</span>
            {alreadyCompleted && (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{mod.title}</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2">{mod.description}</p>
        </div>

        {/* Steps indicator */}
        <ol aria-label="Module steps" className="flex items-center gap-4 mb-8 flex-wrap list-none m-0 p-0">
          {[
            { n: 1, label: content.videos.length > 1 ? `Watch All ${content.videos.length} Chapters` : "Watch Video", done: allVideosWatched || alreadyCompleted },
            { n: 2, label: "Take Quiz", done: quizPassed || alreadyCompleted },
            { n: 3, label: "Complete", done: alreadyCompleted },
          ].map((step, i, arr) => (
            <li key={step.n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${step.done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-slate-300 dark:border-gray-700 text-slate-400 dark:text-gray-600"}`}>
                {step.done
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  : step.n}
              </div>
              <span className={`text-sm ${step.done ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-400 dark:text-gray-600"}`}>
                {step.label}
              </span>
              {i < arr.length - 1 && <div className="w-8 h-px bg-slate-200 dark:bg-gray-800 ml-2" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-4">

            {/* ── Video Player ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              {/* Video playlist tabs (if multiple videos) */}
              {content.videos.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Video chapters"
                  className="flex overflow-x-auto border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0d0d0d]"
                >
                  {content.videos.map((v, i) => {
                    const pct = videoProgress[String(i)] ?? 0;
                    const done = pct >= 80;
                    const active = i === currentVideoIdx;
                    return (
                      <button
                        key={v.id || i}
                        role="tab"
                        aria-selected={active}
                        onClick={() => switchVideo(i)}
                        title={done ? "80%+ watched — counts toward unlocking the quiz" : undefined}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0
                          ${active
                            ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#121212]"
                            : "border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300"
                          }`}
                      >
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                          ${done ? "bg-emerald-500 text-white" : active ? "bg-blue-500 text-white" : "bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-400"}`}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className="max-w-[140px] truncate">{v.title || `Chapter ${i + 1}`}</span>
                        {v.duration && <span className="text-[10px] text-slate-400 dark:text-gray-600">{v.duration}</span>}
                        {pct > 0 && !done && (
                          <span className="text-[10px] text-orange-500 dark:text-orange-400">{pct}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Currently playing video label */}
              {content.videos.length > 1 && (
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#0f0f0f] border-b border-slate-100 dark:border-gray-800/60 flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-gray-600">Now playing:</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">{currentVideoTitle}</span>
                </div>
              )}

              <div className="aspect-video bg-black">
                <VideoPlayer
                  key={`${moduleId}-${currentVideoIdx}`}
                  src={currentVideoUrl}
                  videoRef={videoRef}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onLoadedMetadata={handleMetadataLoaded}
                  onSeeked={handleSeeked}
                  maxSeekFraction={maxSeekFraction}
                  caption={captionsOn && activeCaption ? activeCaption.text : null}
                  captionsOn={captionsOn}
                  hasTranscript={currentTranscript.length > 0}
                  onToggleCaptions={() => setCaptionsOn((v) => !v)}
                  className="w-full h-full"
                />
              </div>

              {/* Watch progress + captions bar */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-slate-200 dark:border-gray-800 flex-wrap gap-3">
                {/* Watch progress */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 whitespace-nowrap">Progress saved</span>
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
                        style={{ width: `${Math.min(100, watchedPercent)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-gray-400 font-mono whitespace-nowrap">
                      {Math.round(watchedPercent)}%
                    </span>
                  </div>
                  {!quizUnlocked && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {content.videos.length > 1 && incompleteChapters.length > 0
                        ? incompleteChapters.length === 1
                          ? `Watch Chapter ${incompleteChapters[0].i + 1} to unlock quiz`
                          : `Watch Chapters ${incompleteChapters.map((c) => c.i + 1).join(" & ")} to unlock quiz`
                        : "Watch 80% to unlock quiz"}
                    </span>
                  )}
                </div>

                {lastSaved && (
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                    ✓ Saved {lastSaved.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>

            {/* ── Preset Captions ─────────────────────────────────────────── */}
            {captionsOn && (
              <div className="bg-blue-50 dark:bg-[#0d1117] border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 min-h-[80px] flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">Live Captions</span>
                </div>
                {activeCaption
                  ? <p className="text-slate-900 dark:text-white text-base leading-relaxed font-medium">{activeCaption.text}</p>
                  : <p className="text-slate-400 dark:text-gray-600 text-sm italic">Play the video to see captions…</p>
                }
              </div>
            )}

            {/* ── Key Points ─────────────────────────────────────────────── */}
            {content.keyPoints?.length > 0 && (
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

            {/* ── Documents ──────────────────────────────────────────────── */}
            {content.documents.length > 0 && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-300 uppercase tracking-wider mb-4">Module Resources</h2>
                <div className="space-y-2">
                  {content.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0f0f0f] hover:border-blue-400/40 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 group transition-all"
                    >
                      <span className="text-xl shrink-0">{fileIcon(doc.fileType)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                          {doc.title}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-gray-600 flex items-center gap-2">
                          {doc.fileType && <span className="uppercase">{doc.fileType}</span>}
                          {doc.size && <><span>·</span><span>{doc.size}</span></>}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-400 dark:text-gray-600 group-hover:text-blue-500 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Transcript ──────────────────────────────────────────────── */}
            {currentTranscript.length > 0 && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {content.videos.length > 1 ? `Transcript — ${currentVideoTitle}` : "Full Transcript"}
                </h2>
                <div className="space-y-3 text-sm leading-relaxed max-h-80 overflow-y-auto pr-2">
                  {currentTranscript.map((line, idx) => {
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

            {/* ── Quiz CTA ────────────────────────────────────────────────── */}
            <div className={`rounded-2xl p-6 border transition-all ${
              alreadyCompleted
                ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20"
                : quizUnlocked
                  ? "bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20"
                  : "bg-slate-50 dark:bg-[#0f0f0f] border-slate-200 dark:border-gray-800 opacity-60"
            }`}>
              {alreadyCompleted ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      ✓ Module Completed
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-500">
                      You've already passed the quiz and earned your points.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={goToQuiz} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-[#1f1f1f]">
                      Retake Quiz
                    </button>
                    {nextModule && !nextModule.locked && (
                      <button onClick={() => navigate(`/modules/${nextModule.id}`)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90">
                        Next Module →
                      </button>
                    )}
                  </div>
                </div>
              ) : quizUnlocked ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Quiz Unlocked
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-500">
                      Pass the quiz (≥70%) to complete this module and earn <strong className="text-yellow-700 dark:text-yellow-300">+{content.points} pts</strong>.
                    </div>
                  </div>
                  <button
                    onClick={goToQuiz}
                    className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 transition"
                  >
                    Take Module Quiz
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-gray-500">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {content.videos.length > 1 && incompleteChapters.length > 0
                    ? incompleteChapters.length === 1
                      ? `Watch Chapter ${incompleteChapters[0].i + 1}: "${incompleteChapters[0].v.title || `Chapter ${incompleteChapters[0].i + 1}`}" to unlock the quiz.`
                      : `Watch ${incompleteChapters.map((c) => `Chapter ${c.i + 1}: "${c.v.title || `Chapter ${c.i + 1}`}"`).join(" and ")} to unlock the quiz.`
                    : "Watch at least 80% of the video to unlock the quiz."}
                </div>
              )}
            </div>

            {/* ── Discussion ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Discussion</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400 mb-5">Share your thoughts about this module</p>

              {/* Comment input */}
              <div className="flex gap-3 mb-5">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true">
                  {user?.initials || "?"}
                </div>
                <div className="flex-1 flex gap-2">
                  <label htmlFor="discussion-comment" className="sr-only">Add a comment</label>
                  <input
                    id="discussion-comment"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                    placeholder="Add a comment…"
                    maxLength={1000}
                    className="flex-1 rounded-xl bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400 dark:placeholder:text-gray-600"
                  />
                  <button
                    onClick={postComment}
                    disabled={!commentInput.trim() || commentPosting}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90 disabled:opacity-40 transition"
                  >
                    {commentPosting ? "…" : "Post"}
                  </button>
                </div>
              </div>

              {/* Comments list */}
              {commentLoading ? (
                <div className="py-6 text-center text-slate-400 dark:text-gray-600 text-sm animate-pulse">Loading discussion…</div>
              ) : discussionComments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-gray-600 text-sm">No comments yet. Be the first to start a discussion!</div>
              ) : (
                <div className="space-y-4">
                  {discussionComments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-gray-300 shrink-0">
                        {c.userInitials || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.userName || "User"}</span>
                            <span className="text-[10px] text-slate-400 dark:text-gray-600">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {c.isOwn && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="text-[10px] text-slate-400 dark:text-gray-600 hover:text-red-500 transition shrink-0"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mt-0.5 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-5">

            {/* Overall progress */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Your Progress</div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-semibold text-slate-900 dark:text-white">{completedCount}/{allModules.length}</div>
                <div className="text-xs text-slate-400 dark:text-gray-500">Modules completed</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${Math.round((completedCount / Math.max(allModules.length, 1)) * 100)}%` }} />
              </div>
            </div>

            {/* This module status */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">This Module</div>
              <div className="space-y-2">
                {/* Per-video progress */}
                {content.videos.map((v, i) => {
                  const pct = videoProgress[String(i)] ?? 0;
                  const done = pct >= 80;
                  return (
                    <div key={v.id || i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => switchVideo(i)}
                          className={`truncate max-w-[130px] text-left font-medium transition ${i === currentVideoIdx ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                        >
                          {content.videos.length > 1 ? `${i + 1}. ${v.title || `Chapter ${i + 1}`}` : "Video watched"}
                        </button>
                        <span className={`font-semibold shrink-0 ml-2 ${done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-gray-400"}`}>
                          {done ? "✓" : `${pct}%`}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${done ? "bg-emerald-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 border-t border-slate-100 dark:border-gray-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-gray-500">Quiz</span>
                  <span className={`font-semibold ${quizPassed ? "text-emerald-600 dark:text-emerald-400" : quizUnlocked ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-gray-600"}`}>
                    {quizPassed ? "Passed ✓" : quizUnlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-gray-500">Points reward</span>
                  <span className="font-bold text-yellow-700 dark:text-yellow-300">+{content.points}</span>
                </div>
              </div>
            </div>

            {/* Up Next */}
            {nextModule && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Up Next</div>
                <div className="bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-700 dark:text-gray-400 mb-1">{nextModule.title}</div>
                  <div className="text-[11px] text-slate-400 dark:text-gray-600 mb-3">{nextModule.description}</div>
                  {nextModule.locked
                    ? <div className="text-xs text-slate-400 dark:text-gray-600 flex items-center gap-1">🔒 Complete this module first</div>
                    : <button onClick={() => navigate(`/modules/${nextModule.id}`)} className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:opacity-90">
                        Start →
                      </button>
                  }
                </div>
              </div>
            )}

          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
