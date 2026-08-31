/** Stylized dispatch map — grid, routes, status-colored mechanic pins */
export function DispatchMapVisual() {
  return (
    <svg
      viewBox="0 0 400 320"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <pattern id="mapGrid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
            opacity="0.35"
          />
        </pattern>
      </defs>
      <rect width="400" height="320" fill="url(#mapGrid)" />

      {/* Routes */}
      <path
        d="M 80 220 Q 140 180 200 140 T 320 90"
        fill="none"
        stroke="var(--status-assigned)"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity="0.55"
      />
      <path
        d="M 60 120 L 180 200 L 280 160"
        fill="none"
        stroke="var(--status-enroute)"
        strokeWidth="2"
        opacity="0.45"
      />

      {/* Pins */}
      <g>
        <circle cx="80" cy="220" r="10" fill="var(--status-assigned)" opacity="0.9" />
        <circle cx="80" cy="220" r="18" fill="var(--status-assigned)" opacity="0.15" />
      </g>
      <g>
        <circle cx="200" cy="140" r="10" fill="var(--status-enroute)" opacity="0.9" />
        <circle cx="200" cy="140" r="18" fill="var(--status-enroute)" opacity="0.15" />
      </g>
      <g>
        <circle cx="320" cy="90" r="10" fill="var(--status-progress)" opacity="0.9" />
        <circle cx="320" cy="90" r="18" fill="var(--status-progress)" opacity="0.15" />
      </g>
      <g>
        <circle cx="280" cy="240" r="8" fill="var(--status-completed)" opacity="0.85" />
        <circle cx="280" cy="240" r="14" fill="var(--status-completed)" opacity="0.12" />
      </g>
    </svg>
  );
}
