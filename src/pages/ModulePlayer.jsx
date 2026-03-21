import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import VideoPlayer from "../components/VideoPlayer";
import { useAuth } from "../contexts/AuthContext";
import { modules as modulesApi, users as usersApi, transcribe } from "../lib/api";

function getContent(mod) {
  return {
    title: mod?.title ?? "",
    subtitle: mod?.description ?? "",
    category: mod?.category ?? "",
    duration: mod?.duration ?? "",
    points: mod?.pointsValue ?? 0,
    videoUrl: mod?.videoUrl || "/videos/demo.mp4",
    keyPoints: mod?.keyPoints ?? [],
    transcript: mod?.transcript ?? [],
  };
}

export default function ModulePlayer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mod, setMod] = useState(null);
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Video progress
  const [videoTime, setVideoTime] = useState(0);
  const [watchedPercent, setWatchedPercent] = useState(0);
  const videoRef = useRef(null);
  const lastSavedPct = useRef(0);
  const saveTimer = useRef(null);

  // Caption state
  const [captionsOn, setCaptionsOn] = useState(false);

  // AI transcription state
  const [aiMode, setAiMode] = useState(false);
  const [aiTranscript, setAiTranscript] = useState([]);
  const [aiRecording, setAiRecording] = useState(false);
  const [aiError, setAiError] = useState("");
  const recorderRef = useRef(null);

  // Load module data
  useEffect(() => {
    setLoading(true);
    Promise.all([modulesApi.get(moduleId), modulesApi.list()])
      .then(([m, all]) => {
        setMod(m);
        setAllModules(all);
        // Restore saved watch progress
        const saved = m?.userProgress?.watchedPercent || 0;
        setWatchedPercent(saved);
        lastSavedPct.current = saved;
        // Seek video to saved position once metadata loads (handled via ref callback)
        if (saved > 0 && saved < 95 && videoRef.current?.duration) {
          videoRef.current.currentTime = (saved / 100) * videoRef.current.duration;
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [moduleId]);

  const content = useMemo(() => getContent(mod), [mod]);
  const currentIdx = allModules.findIndex((m) => m.id === moduleId);
  const nextModule = allModules[currentIdx + 1] || null;
  const completedCount = allModules.filter((m) => m.userProgress?.completed).length;
  const alreadyCompleted = mod?.userProgress?.completed ?? false;
  const quizPassed = mod?.userProgress?.quizPassed ?? false;
  const quizUnlocked = watchedPercent >= 80 || quizPassed || alreadyCompleted;

  // Save progress to the server (debounced)
  const saveProgress = useCallback(async (pct) => {
    if (!user?.id || !moduleId) return;
    try {
      await usersApi.updateModuleProgress(user.id, moduleId, {
        watchedPercent: Math.round(pct),
      });
      lastSavedPct.current = pct;
    } catch (err) {
      console.error("Failed to save progress", err);
    }
  }, [user?.id, moduleId]);

  // Save every 30 seconds if progress advanced
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (watchedPercent > lastSavedPct.current + 1) {
        saveProgress(watchedPercent);
      }
    }, 30000);
    return () => clearInterval(saveTimer.current);
  }, [watchedPercent, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (watchedPercent > lastSavedPct.current + 1) {
        saveProgress(watchedPercent);
      }
    };
  }, [watchedPercent, saveProgress]);

  // Track video time and compute watched %
  const handleTimeUpdate = useCallback((currentTime) => {
    setVideoTime(Math.floor(currentTime));
    const dur = videoRef.current?.duration;
    if (dur > 0) {
      const pct = Math.min(100, (currentTime / dur) * 100);
      setWatchedPercent((prev) => Math.max(prev, pct));
    }
  }, []);

  // On video ended: save 100%
  const handleVideoEnded = useCallback(() => {
    setWatchedPercent(100);
    saveProgress(100);
  }, [saveProgress]);

  // Seek to saved position when video metadata loads
  const handleMetadataLoaded = useCallback(() => {
    const dur = videoRef.current?.duration;
    const saved = lastSavedPct.current;
    if (dur > 0 && saved > 0 && saved < 95) {
      videoRef.current.currentTime = (saved / 100) * dur;
    }
  }, []);

  // Preset captions
  const activeCaptionIdx = useMemo(() => {
    if (!content.transcript?.length) return -1;
    let idx = -1;
    for (let i = 0; i < content.transcript.length; i++) {
      if (content.transcript[i].time <= videoTime) idx = i;
    }
    return idx;
  }, [videoTime, content.transcript]);
  const activeCaption = activeCaptionIdx >= 0 ? content.transcript[activeCaptionIdx] : null;

  // AI transcription
  const loadAiMode = () => { setAiMode(true); setAiError(""); setAiTranscript([]); };

  const startAiRecording = useCallback(async () => {
    if (!videoRef.current) return;
    setAiError("");
    let stream;
    try { stream = videoRef.current.captureStream(); }
    catch { setAiError("Your browser does not support video stream capture (use Chrome/Edge)."); return; }
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) { setAiError("No audio track found in this video."); return; }
    const audioStream = new MediaStream(audioTracks);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(audioStream, { mimeType });
    recorder.ondataavailable = async (e) => {
      if (e.data.size < 2000) return;
      try {
        const result = await transcribe(new Blob([e.data], { type: mimeType }));
        if (result.text?.trim()) setAiTranscript((prev) => [...prev, { text: result.text.trim() }]);
      } catch (err) {
        if (!err.message?.includes("short") && !err.message?.includes("format"))
          setAiError("Transcription failed — check your GROQ_API_KEY is set.");
      }
    };
    recorder.start(8000);
    setAiRecording(true);
    recorderRef.current = recorder;
  }, []);

  const stopAiRecording = useCallback(() => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    setAiRecording(false);
  }, []);

  useEffect(() => () => stopAiRecording(), [stopAiRecording]);

  const goToQuiz = () => navigate(`/quiz/module/${moduleId}`);

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
      <DashboardNav initials={user?.initials || "?"} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
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
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          {[
            { n: 1, label: "Watch Video", done: watchedPercent >= 80 || alreadyCompleted },
            { n: 2, label: "Take Quiz", done: quizPassed || alreadyCompleted },
            { n: 3, label: "Complete", done: alreadyCompleted },
          ].map((step, i, arr) => (
            <div key={step.n} className="flex items-center gap-2">
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
              {i < arr.length - 1 && <div className="w-8 h-px bg-slate-200 dark:bg-gray-800 ml-2" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-4">

            {/* ── Video Player ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black">
                <VideoPlayer
                  key={moduleId}
                  src={content.videoUrl}
                  videoRef={videoRef}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onLoadedMetadata={handleMetadataLoaded}
                  className="w-full h-full"
                />
              </div>

              {/* Watch progress + captions bar */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-slate-200 dark:border-gray-800 flex-wrap gap-3">
                {/* Watch progress */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
                        style={{ width: `${Math.min(100, watchedPercent)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-gray-400 font-mono whitespace-nowrap">
                      {Math.round(watchedPercent)}% watched
                    </span>
                  </div>
                  {!quizUnlocked && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Watch 80% to unlock quiz
                    </span>
                  )}
                </div>

                {/* Caption controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {content.transcript?.length > 0 && (
                    <button
                      onClick={() => { setCaptionsOn((v) => !v); setAiMode(false); stopAiRecording(); }}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                        ${captionsOn && !aiMode
                          ? "bg-blue-500/10 border-blue-400/30 text-blue-500 dark:text-blue-300"
                          : "bg-slate-100 dark:bg-[#1a1a1a] border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      {captionsOn && !aiMode ? "Captions ON" : "Captions"}
                    </button>
                  )}

                  {!aiMode ? (
                    <button
                      onClick={loadAiMode}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Transcribe
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!aiRecording && (
                        <button
                          onClick={startAiRecording}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Start Transcribing
                        </button>
                      )}
                      {aiRecording && (
                        <button
                          onClick={stopAiRecording}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                        >
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          Stop
                        </button>
                      )}
                      <button
                        onClick={() => { setAiMode(false); stopAiRecording(); setAiTranscript([]); setAiError(""); }}
                        className="text-xs text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 px-2"
                      >
                        ✕ Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Preset Captions ─────────────────────────────────────────── */}
            {captionsOn && !aiMode && (
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

            {/* ── AI Transcription Panel ──────────────────────────────────── */}
            {aiMode && (
              <div className="bg-violet-50 dark:bg-[#0e0b1a] border border-violet-200 dark:border-violet-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2 w-2 relative">
                    {aiRecording
                      ? <><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-violet-500" /><span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" /></>
                      : <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
                    }
                  </span>
                  <span className="text-xs font-medium text-violet-500 dark:text-violet-400 uppercase tracking-wider">
                    AI Transcription {aiRecording ? "— Recording" : "— Ready"}
                  </span>
                </div>
                {aiError && <p className="text-sm text-red-500 dark:text-red-400 mb-2">{aiError}</p>}
                {!aiRecording && !aiTranscript.length && (
                  <p className="text-slate-400 dark:text-gray-500 text-sm italic">
                    Press <strong>Start Transcribing</strong> then play the video — Whisper transcribes every 8 s.
                  </p>
                )}
                {aiTranscript.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {aiTranscript.map((entry, i) => (
                      <p key={i} className={`text-sm leading-relaxed rounded-lg px-3 py-2 ${i === aiTranscript.length - 1 ? "bg-violet-100 dark:bg-violet-500/15 text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-gray-400"}`}>
                        {entry.text}
                      </p>
                    ))}
                  </div>
                )}
                {aiRecording && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-violet-500 dark:text-violet-400">
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-1 bg-violet-400 rounded-full animate-bounce" style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    Listening… next transcription in ~8 s
                  </div>
                )}
                <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-3">
                  Powered by Groq Whisper · fast cloud transcription
                </p>
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

            {/* ── Transcript ──────────────────────────────────────────────── */}
            {content.transcript?.length > 0 && (
              <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Full Transcript</h2>
                <div className="space-y-3 text-sm leading-relaxed max-h-80 overflow-y-auto pr-2">
                  {content.transcript.map((line, idx) => {
                    const mins = Math.floor(line.time / 60);
                    const secs = String(line.time % 60).padStart(2, "0");
                    const isActive = idx === activeCaptionIdx && captionsOn && !aiMode;
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
                      <button onClick={() => navigate(`/modules/${nextModule.id}`)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90">
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
                      Pass the quiz (≥70%) to complete this module and earn <strong className="text-yellow-600 dark:text-yellow-300">+{content.points} pts</strong>.
                    </div>
                  </div>
                  <button
                    onClick={goToQuiz}
                    className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90 transition"
                  >
                    Take Module Quiz
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-gray-500">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Watch at least 80% of the video to unlock the quiz.
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-gray-500">Video watched</span>
                  <span className={`font-semibold ${watchedPercent >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-gray-300"}`}>
                    {Math.round(watchedPercent)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-gray-500">Quiz</span>
                  <span className={`font-semibold ${quizPassed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-gray-600"}`}>
                    {quizPassed ? "Passed ✓" : quizUnlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-gray-500">Points reward</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-300">+{content.points}</span>
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
                    : <button onClick={() => navigate(`/modules/${nextModule.id}`)} className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 text-white hover:opacity-90">
                        Start →
                      </button>
                  }
                </div>
              </div>
            )}

            {/* AI Transcription info */}
            <div className="bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/15 rounded-2xl p-5">
              <div className="text-xs font-semibold text-violet-600 dark:text-violet-300 mb-1">✨ AI Live Transcription</div>
              <div className="text-xs text-slate-500 dark:text-gray-500 leading-relaxed">
                Click <strong>AI Transcribe</strong> to transcribe video audio every 8 s using Groq Whisper — instant, cloud-powered.
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
