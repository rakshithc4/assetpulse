// The AssetPulse mark: a flat-top hexagon — the "asset" shell, echoing a
// bolt head / equipment plate — with a live ECG-style pulse line breaking
// through and past its edges, standing for the maintenance telemetry the
// product is actually built around. One accent color (the same amber used
// for the shader backdrop and the Supervisor persona card, per
// design/tokens.json's opstatus.maintenance) keeps it consistent with the
// rest of the login screen rather than inventing a new brand hue.
export function AssetPulseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label="AssetPulse">
      <path
        d="M54.52 19 L32 6 L9.48 19 L9.48 45 L32 58 L54.52 45 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <path
        d="M2 32 L19 32 L25 15 L32 49 L38 20 L44 32 L62 32"
        stroke="#d97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(217, 119, 6, 0.65))' }}
      />
      <circle cx="32" cy="49" r="2.25" fill="#d97706" style={{ filter: 'drop-shadow(0 0 6px rgba(217, 119, 6, 0.65))' }} />
    </svg>
  );
}
