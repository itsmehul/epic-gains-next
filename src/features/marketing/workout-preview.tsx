export function WorkoutPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="overflow-hidden rounded-[2.25rem] border border-black/8 bg-white shadow-[0_24px_60px_-20px_rgba(32,33,36,0.28)]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-[0.7rem] font-medium tracking-wide text-[#5f6368]">
            Today
          </p>
          <p className="text-[0.7rem] font-semibold text-[#137333]">
            +12% vs last
          </p>
        </div>
        <div className="px-5 pb-2">
          <p className="text-2xl font-medium tracking-tight text-[#202124]">
            Push day
          </p>
          <p className="mt-1 text-sm text-[#5f6368]">4 exercises · 16 sets</p>
        </div>
        <div className="space-y-2 px-4 pb-6">
          {[
            { name: "Bench press", detail: "4 × 85 kg" },
            { name: "Overhead press", detail: "3 × 50 kg" },
            { name: "Incline dumbbell", detail: "3 × 28 kg" },
            { name: "Tricep pushdown", detail: "3 × 25 kg" },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-2xl bg-[#f8f9fa] px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-[#202124]">
                {row.name}
              </span>
              <span className="text-xs text-[#5f6368]">{row.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
