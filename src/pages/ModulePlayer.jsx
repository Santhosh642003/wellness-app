import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const FALLBACK_TRANSCRIPT = [
  { time: 0, text: "Welcome to this wellness module." },
  { time: 8, text: "In this lesson, we review practical prevention and health tips." },
  { time: 18, text: "Pause, breathe, and reflect on one action you can take today." },
];

export default function ModulePlayer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [moduleData, setModuleData] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [language, setLanguage] = useState("en");
  const [translatedLine, setTranslatedLine] = useState("");

  useEffect(() => {
    async function loadModule() {
      const response = await fetch(`${API_BASE}/modules/${moduleId}`);
      const payload = await response.json();
      setModuleData(payload.module);
    }

    async function loadProgress() {
      const response = await fetch(`${API_BASE}/progress/modules/${moduleId}?userId=1`);
      const payload = await response.json();
      setProgressPercent(Number(payload.progress.progress_percent || 0));
      setPosition(Number(payload.progress.last_position_seconds || 0));
    }

    loadModule();
    loadProgress();
  }, [moduleId]);

  const transcript = useMemo(() => {
    if (!moduleData?.transcript || moduleData.transcript.length === 0) return FALLBACK_TRANSCRIPT;
    return moduleData.transcript;
  }, [moduleData]);

  const activeLine = useMemo(() => {
    let current = transcript[0]?.text || "";
    for (const line of transcript) {
      if (position >= Number(line.time || 0)) current = line.text;
    }
    return current;
  }, [position, transcript]);

  useEffect(() => {
    let cancelled = false;

    async function translateLive() {
      if (!activeLine || language === "en") {
        setTranslatedLine("");
        return;
      }

      const response = await fetch(`${API_BASE}/translation/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: activeLine, targetLanguage: language }),
      });

      const payload = await response.json();
      if (!cancelled) {
        setTranslatedLine(payload.translatedText || "");
      }
    }

    translateLive();
    return () => {
      cancelled = true;
    };
  }, [activeLine, language]);

  const saveProgress = async (newPercent, seconds) => {
    await fetch(`${API_BASE}/progress/modules/${moduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: 1, progressPercent: newPercent, lastPositionSeconds: seconds }),
    });
  };

  const onTimeUpdate = async () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;
    const percent = Math.min(100, (current / video.duration) * 100);
    setProgressPercent(percent);
    setPosition(current);

    if (Math.floor(current) % 5 === 0) {
      await saveProgress(percent, current);
    }
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration || 0);
    if (position > 0) {
      video.currentTime = position;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      <DashboardNav points={870} streakDays={7} initials="SN" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">{moduleData?.title || "Module Player"}</h1>
          <p className="text-gray-400 mt-2">{moduleData?.description || "Loading module..."}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-9">
            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black">
                <video
                  ref={videoRef}
                  src={moduleData?.video_url || "https://cdn.coverr.co/videos/coverr-girl-doing-yoga-1579/1080p.mp4"}
                  controls
                  onLoadedMetadata={onLoadedMetadata}
                  onTimeUpdate={onTimeUpdate}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="mt-4 bg-[#121212] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Real progress: {progressPercent.toFixed(1)}%</span>
                <span>{Math.floor(position)}s / {Math.floor(duration)}s</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-black border border-gray-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Live Transcript Translation</h2>
                <select className="bg-[#141414] border border-gray-700 rounded-lg px-3 py-1 text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Current line</div>
                  <div className="text-gray-200">{activeLine}</div>
                </div>
                {language !== "en" && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Translated ({language})</div>
                    <div className="text-emerald-300">{translatedLine || "Translating..."}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => navigate(`/quiz/module/${moduleId}`)} className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-emerald-400 hover:opacity-90 transition">
                Take Module Quiz
              </button>
              <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl font-semibold bg-[#141414] border border-gray-800 hover:bg-[#171717]">
                Back
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
