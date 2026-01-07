import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";

import demoVideo from "../assets/demo.mp4"; // <-- change filename if needed

export default function ModulePlayer() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  // Demo data (UI only)
  const moduleInfo = useMemo(() => {
    // You can later replace this with real data lookup by moduleId
    const map = {
      m1: {
        title: "HPV Vaccine Basics",
        subtitle: "Understanding HPV, its risks, and how the vaccine protects you",
      },
      m2: {
        title: "HPV and Cancer Prevention",
        subtitle: "Learn how HPV vaccines reduce cancer risk in both men and women",
      },
      m3: {
        title: "MenB Meningitis Overview",
        subtitle: "What is meningococcal disease and why college students are at risk",
      },
    };

    return (
      map[moduleId] || {
        title: "HPV and Cancer Prevention",
        subtitle: "Learn how HPV vaccines reduce cancer risk in both men and women",
      }
    );
  }, [moduleId]);

  const transcript = useMemo(
    () => [
      { t: "[00:00]", text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", bold: false },
      { t: "[00:08]", text: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.", bold: true },
      { t: "[00:16]", text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.", bold: false },
      { t: "[00:24]", text: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", bold: false },
    ],
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0b] text-white">
      {/* Top Nav */}
      <DashboardNav points={870} streakDays={7} initials="SN" />

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">{moduleInfo.title}</h1>
          <p className="text-gray-400 mt-2">{moduleInfo.subtitle}</p>
        </div>

        {/* Player + Right Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Video Player */}
          <section className="lg:col-span-9">
            <div className="bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black">
                <video
                  src={demoVideo}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Transcript */}
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">Transcript</h2>

              <div className="space-y-4 text-sm leading-relaxed">
                {transcript.map((line, idx) => (
                  <div key={idx} className={line.bold ? "text-gray-100 font-semibold" : "text-gray-400"}>
                    <div className={line.bold ? "text-gray-200 font-bold mb-1" : "text-gray-500 mb-1"}>
                      {line.t}
                    </div>
                    <div>{line.text}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate(`/quiz/module/${moduleId}`)}
                  className="px-6 py-3 rounded-xl font-semibold
                             bg-gradient-to-r from-blue-500 to-emerald-400
                             hover:opacity-90 transition"
                >
                  Take Module Quiz
                </button>

                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 rounded-xl font-semibold
                             bg-[#141414] border border-gray-800 hover:bg-[#171717]"
                >
                  Back
                </button>
              </div>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Progress Card */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5">
              <div className="text-sm text-gray-400">Your Progress</div>
              <div className="text-xs text-gray-500 mt-1">Keep going! You’re doing great</div>

              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-lg font-semibold">2/6</div>
                <div className="text-xs text-gray-500">Modules Completed</div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">Progress</div>
                <div className="h-2 rounded-full bg-[#0f0f0f] border border-gray-800 overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-blue-500 to-emerald-400" />
                </div>
              </div>
            </div>

            {/* Next Module Card */}
            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold mb-3">Next Module</div>

              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 opacity-90">
                <div className="text-xs text-gray-500 mb-2">MenB Meningitis Overview</div>
                <div className="text-[11px] text-gray-600 leading-relaxed">
                  What is meningococcal disease and why college students are at risk
                </div>

                <button
                  onClick={() => navigate("/modules/m3")}
                  className="mt-4 w-full px-4 py-2 rounded-xl text-sm font-semibold
                             bg-[#1a1a1a] border border-gray-800 hover:bg-[#1f1f1f]"
                >
                  Start Module
                </button>
              </div>

              <div className="text-xs text-gray-600 mt-3">
                Current module: <span className="text-gray-400">{moduleId}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
