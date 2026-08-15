export function WorkoutPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-card text-card-foreground ring-1 ring-foreground/8 dark:ring-foreground/12">
        <div
          aria-hidden
          className="pattern-diagonal pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply dark:mix-blend-screen dark:opacity-25"
        />
        <div className="relative flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-[0.7rem] font-medium tracking-[0.4px] text-muted-foreground uppercase">
            Today
          </p>
          <p className="text-[0.7rem] font-medium text-primary">+12% vs last</p>
        </div>
        <div className="relative px-5 pb-3">
          <p className="text-2xl font-medium tracking-tight">Push day</p>
          <p className="text-muted-foreground mt-1 text-sm">
            4 exercises · 16 sets
          </p>
        </div>
        <div className="relative space-y-2 px-4 pb-6">
          {[
            { name: "Bench press", detail: "4 × 85 kg" },
            { name: "Overhead press", detail: "3 × 50 kg" },
            { name: "Incline dumbbell", detail: "3 × 28 kg" },
            { name: "Tricep pushdown", detail: "3 × 25 kg" },
          ].map((row) => (
            <div
              key={row.name}
              className="relative overflow-hidden rounded-xl bg-muted/70 px-3.5 py-2.5"
            >
              <div
                aria-hidden
                className="pattern-graph pointer-events-none absolute inset-0 opacity-70"
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{row.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {row.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
