export function FitBlobField({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 1200 720"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="fit-blob-drift">
        <ellipse
          cx="180"
          cy="220"
          rx="280"
          ry="240"
          fill="oklch(0.837 0.128 66.29 / 0.55)"
        />
        <ellipse
          cx="420"
          cy="160"
          rx="210"
          ry="190"
          fill="oklch(0.705 0.213 47.604 / 0.42)"
        />
        <ellipse
          cx="320"
          cy="340"
          rx="170"
          ry="150"
          fill="oklch(0.646 0.222 41.116 / 0.38)"
        />
      </g>
      <g className="fit-blob-drift-slow">
        <ellipse
          cx="980"
          cy="480"
          rx="260"
          ry="220"
          fill="oklch(0.837 0.128 66.29 / 0.4)"
        />
        <ellipse
          cx="1080"
          cy="280"
          rx="180"
          ry="200"
          fill="oklch(0.553 0.195 38.402 / 0.35)"
        />
        <ellipse
          cx="860"
          cy="360"
          rx="140"
          ry="130"
          fill="oklch(0.705 0.213 47.604 / 0.45)"
        />
      </g>
    </svg>
  );
}

export function FitBlobCluster({
  palette = "ember",
}: {
  palette?: "ember" | "amber" | "ink";
}) {
  const fills =
    palette === "amber"
      ? [
          "oklch(0.837 0.128 66.29 / 0.7)",
          "oklch(0.705 0.213 47.604 / 0.55)",
          "oklch(0.97 0.012 70 / 0.9)",
        ]
      : palette === "ink"
        ? [
            "oklch(0.646 0.222 41.116 / 0.45)",
            "oklch(0.553 0.195 38.402 / 0.4)",
            "oklch(0.837 0.128 66.29 / 0.5)",
          ]
        : [
            "oklch(0.705 0.213 47.604 / 0.65)",
            "oklch(0.646 0.222 41.116 / 0.5)",
            "oklch(0.837 0.128 66.29 / 0.55)",
          ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 420 360"
      className="h-auto w-full max-w-md"
      fill="none"
    >
      <ellipse cx="210" cy="180" rx="170" ry="150" fill={fills[0]} />
      <ellipse cx="140" cy="130" rx="110" ry="100" fill={fills[1]} />
      <ellipse cx="280" cy="230" rx="90" ry="80" fill={fills[2]} />
    </svg>
  );
}
