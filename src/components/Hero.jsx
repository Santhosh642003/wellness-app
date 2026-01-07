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
      <p className="max-w-3xl mx-auto text-gray-200/90 leading-relaxed mb-14">
        Getting informed about <span className="font-semibold">HPV</span> and{" "}
        <span className="font-semibold">Meningitis B</span> vaccines shouldn’t
        be confusing or boring. That’s why we’ve created quick, fun, and
        reliable interactive modules. Start playing now to get the facts you
        need, earn valuable points, and redeem great rewards for prioritizing
        your health on campus.
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
