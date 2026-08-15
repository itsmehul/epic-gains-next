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
        <ellipse cx="180" cy="220" rx="280" ry="240" fill="#7EE0D6" />
        <ellipse cx="420" cy="160" rx="210" ry="190" fill="#D4F07A" />
        <ellipse cx="320" cy="340" rx="170" ry="150" fill="#FFB074" />
      </g>
      <g className="fit-blob-drift-slow">
        <ellipse cx="980" cy="480" rx="260" ry="220" fill="#8EE8DE" />
        <ellipse cx="1080" cy="280" rx="180" ry="200" fill="#FFE27A" />
        <ellipse cx="860" cy="360" rx="140" ry="130" fill="#FF9A7A" />
      </g>
    </svg>
  );
}

export function FitBlobCluster({
  palette = "teal",
}: {
  palette?: "teal" | "lime" | "coral";
}) {
  const fills =
    palette === "lime"
      ? ["#D4F07A", "#A8E6CF", "#FFE27A"]
      : palette === "coral"
        ? ["#FFB074", "#FF9A7A", "#FFE27A"]
        : ["#7EE0D6", "#B8F0C8", "#FFE27A"];

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
