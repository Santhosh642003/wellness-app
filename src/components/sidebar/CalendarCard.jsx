const daysShort = ["S", "M", "T", "W", "Th", "F", "Sa"];

// Dec 2025 starts on Monday (so offset = 1 when Sunday=0)
const startOffset = 1;
const totalDays = 31;

const activeDays = new Set([1, 7, 12, 18, 21]); // just styling from your mock
const today = 12;

export default function CalendarCard() {
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const dayNum = i - startOffset + 1;
    const valid = dayNum >= 1 && dayNum <= totalDays;

    return {
      key: i,
      dayNum,
      valid,
      isActive: valid && activeDays.has(dayNum),
      isToday: valid && dayNum === today,
    };
  });

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Dec 2025</h3>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-gray-400">
        {daysShort.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}

        {cells.map((c) => (
          <div key={c.key} className="flex justify-center">
            <div
              className={[
                "h-7 w-7 rounded-full flex items-center justify-center border",
                c.valid ? "border-gray-800" : "border-transparent opacity-0",
                c.isActive
                  ? "bg-yellow-400/15 border-yellow-400/30 text-yellow-300"
                  : "text-gray-300",
                c.isToday ? "ring-2 ring-emerald-400/40" : "",
              ].join(" ")}
            >
              {c.valid ? c.dayNum : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
