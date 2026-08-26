const cards = [
  {
    title: "Protect Your\nHealth",
    body:
      "Understanding your physical and mental health helps you recognize what’s normal, spot warning signs early, and make confident choices — from how you sleep and manage stress to knowing when to reach out for support.",
  },
  {
    title: "Prevent What\nYou Can",
    body:
      "Many health challenges are preventable or manageable when you’re informed. Learning about risk factors, healthy habits, and available campus resources means you can take action early — before small concerns grow into bigger ones.",
  },
  {
    title: "Support Your\nCommunity",
    body:
      "Your wellbeing connects to the people around you. When you build knowledge and healthy habits, you’re better equipped to support friends, reduce stigma, and help create a campus culture where everyone can thrive.",
  },
];

export default function Why() {
  return (
    <section id="value" className="py-24 px-6">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl font-semibold mb-6 text-slate-900 dark:text-white">Why Get Informed?</h2>
        <p className="text-slate-600 dark:text-gray-400 leading-relaxed">
          Building healthy habits starts with knowing the facts — about your
          mind, your body, and everything in between.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        {cards.map((c, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-gray-800 rounded-2xl px-10 py-12 text-center shadow-sm"
          >
            <h3
              className="text-2xl font-semibold mb-8 whitespace-pre-line
                         bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent"
            >
              {c.title}
            </h3>

            <p className="text-slate-600 dark:text-gray-200/90 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
