import { Play, TrendingUp, CheckCircle, Gift, ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Learn",
    description: "Complete interactive modules",
    icon: Play,
  },
  {
    title: "Quiz",
    description:
      "Test your knowledge with daily quizzes and bi-weekly competitions",
    icon: TrendingUp,
  },
  {
    title: "Earn Points",
    description: "Collect points for every completed activity",
    icon: CheckCircle,
  },
  {
    title: "Rewards",
    description: "Redeem points for gift cards and rewards",
    icon: Gift,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl font-semibold mb-4">How It Works</h2>
        <p className="text-gray-400">
          Four simple steps to earn rewards while learning
        </p>
      </div>

      {/* Cards */}
      <div className="relative max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="relative">
              {/* Card */}
              <div className="bg-[#121212] border border-gray-800 rounded-2xl p-8 h-full text-center shadow-lg">
                <div className="flex justify-center mb-6">
                  <Icon className="w-10 h-10 text-blue-400" />
                </div>

                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow (desktop only) */}
              {index !== steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-6 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-blue-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
