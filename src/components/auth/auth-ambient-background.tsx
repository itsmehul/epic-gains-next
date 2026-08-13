export function AuthAmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
    >
      <svg
        className="auth-shapes absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="-40" cy="-20" r="380" fill="var(--chart-1)" opacity="0.45" />
        <circle cx="1520" cy="980" r="420" fill="var(--chart-2)" opacity="0.4" />
        <circle
          cx="1280"
          cy="180"
          r="140"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="48"
          opacity="0.35"
        />
        <rect
          x="-40"
          y="620"
          width="280"
          height="280"
          rx="88"
          fill="var(--chart-4)"
          opacity="0.32"
        />
      </svg>
    </div>
  );
}
