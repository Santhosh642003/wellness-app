import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";


export default function Navbar() {
  const links = useMemo(
    () => [
      { label: "Home", href: "#home", id: "home" },
      { label: "Value", href: "#value", id: "value" },
      { label: "How It Works", href: "#how-it-works", id: "how-it-works" },
    ],
    []
  );

  const [active, setActive] = useState("home");
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter(Boolean);

    if (sections.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the intersecting section closest to the top
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            id: e.target.id,
            top: e.boundingClientRect.top,
          }))
          .sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];

        if (visible?.id && visible.id !== activeRef.current) {
          setActive(visible.id);
        }
      },
      {
        root: null,
        threshold: 0.12,
        // This makes "active" update when a section enters the top viewport zone
        rootMargin: "-20% 0px -70% 0px",
      }
    );

    sections.forEach((s) => obs.observe(s));

    return () => obs.disconnect();
  }, [links]);

  const handleClick = (id) => {
    setActive(id); // immediate underline shift on click
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#2b2b2b]/90 backdrop-blur border-b border-black/20">
      <div className="max-w-7xl mx-auto flex items-center px-6 py-4">
        {/* Left */}
        <div className="flex items-center gap-5 mr-14">
          <img
            src="/njit_logo.png"
            alt="NJIT"
            className="h-10 w-auto filter grayscale invert brightness-110"
            draggable="false"
          />
          <div className="h-10 w-px bg-gray-500/60" />
          <div className="text-white font-semibold">
            Campus Wellness Services
          </div>
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-100">
            {links.map((l) => (
              <a
                key={l.id}
                href={l.href}
                onClick={() => handleClick(l.id)}
                className={`relative py-1 transition-colors ${
                  active === l.id
                    ? "text-white"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {l.label}

                {/* Same smooth animation */}
                <span
                  className={`absolute left-0 -bottom-2 h-[2px] w-full bg-blue-500
                              transition-all duration-300 ease-out
                              ${active === l.id ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}`}
                  style={{ transformOrigin: "left" }}
                />
              </a>
            ))}
          </nav>

        <Link
        to="/login"
        className="px-7 py-3 rounded-xl font-semibold text-white
                    bg-gradient-to-r from-blue-500 to-emerald-400
                    shadow-[0_10px_24px_rgba(16,185,129,0.18)]
                    hover:scale-[1.02] transition-transform"
        >
        Sign in
        </Link>

        </div>
      </div>
    </header>
  );
}
