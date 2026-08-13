import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section id="home" className="px-6 pt-28 pb-24 text-center">
      {/* Title */}
      <h1 className="text-5xl md:text-6xl font-semibold mb-8">
        <span className="bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
          We care about you.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-3xl mx-auto text-slate-600 dark:text-gray-200/90 leading-relaxed mb-14">
        Wellness covers more than any single topic. Explore a growing library of
        interactive modules — from{" "}
        <span className="font-semibold">mental health</span> and{" "}
        <span className="font-semibold">preventive care</span> to{" "}
        <span className="font-semibold">healthy habits</span> and{" "}
        <span className="font-semibold">financial wellbeing</span>. Learn at
        your own pace, test your knowledge, earn points, and redeem real rewards
        — all while building skills that stay with you beyond campus.
      </p>

      {/* CTA */}
      <Link
      to="/login"
        className="px-10 py-4 rounded-xl text-lg font-semibold text-white
                   bg-gradient-to-r from-blue-500 to-emerald-400
                   shadow-[0_12px_28px_rgba(16,185,129,0.18)]
                   hover:scale-[1.02] transition-transform"
      >
        Start Learning
      </Link>
    </section>
  );
}
