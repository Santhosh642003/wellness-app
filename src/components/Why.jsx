const cards = [
  {
    title: "Protect Your\nHealth",
    body:
      "Learning about HPV and Meningitis B helps you understand the risks, symptoms, and how these infections spread. When you know the facts, you can make confident decisions about your health.",
  },
  {
    title: "Prevent What\nYou Can",
    body:
      "Both HPV and Meningitis B are preventable. Staying informed helps you recognize early warning signs and understand the importance of vaccination, so you can take action before problems start.",
  },
  {
    title: "Support Your\nCommunity",
    body:
      "Being informed doesn’t just protect you. It also helps keep your friends, classmates, and family safer by reducing the chances of outbreaks and promoting healthy habits.",
  },
];

export default function Why() {
  return (
    <section id="value" className="py-24 px-6">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl font-semibold mb-6">Why Get Informed?</h2>
        <p className="text-gray-400 leading-relaxed">
          Understanding the facts about HPV and Meningitis B is the first step
          to protecting your health
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        {cards.map((c, idx) => (
          <div
            key={idx}
            className="bg-[#121212] border border-gray-800 rounded-2xl px-10 py-12 text-center shadow-lg"
          >
            <h3
              className="text-2xl font-semibold mb-8 whitespace-pre-line
                         bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent"
            >
              {c.title}
            </h3>

            <p className="text-gray-200/90 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
