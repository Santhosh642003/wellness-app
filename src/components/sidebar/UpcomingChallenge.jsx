import { useNavigate } from "react-router-dom";

export default function UpcomingChallenge() {
  const navigate = useNavigate();

  return (
    <div className="mt-4 bg-[#121212] border border-gray-800 rounded-2xl p-4">
      <h3 className="font-semibold text-gray-100">Upcoming Challenge</h3>
      <p className="text-sm text-gray-400 mt-1">Bi-weekly challenge • +300 points</p>

      <button
        onClick={() => navigate("/quiz/biweekly")}
        className="mt-4 w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 font-semibold hover:opacity-90 transition"
      >
        Start Bi-Weekly Quiz
      </button>
    </div>
  );
}
