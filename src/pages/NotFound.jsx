import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ background: "var(--bg-page)" }}>
      <div className="text-center">
        <div className="text-8xl font-black text-slate-200 dark:text-gray-800 select-none">404</div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mt-2 mb-3">Page not found</h1>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-8 max-w-sm">
          The page you're looking for doesn't exist or was moved.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-[#222] transition"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
