import { cn } from "@/lib/utils"

/**
 * GainTrack logo mark: three rising bars + an upward arrow inside a rounded
 * green badge — "tracking gains". Self-contained SVG (own gradient + colors),
 * so it renders consistently anywhere.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="GainTrack logo"
    >
      <defs>
        <linearGradient id="gt-grad" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#15915a" />
          <stop offset="1" stopColor="#2fd07f" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gt-grad)" />
      {/* rising bars */}
      <rect x="11" y="28" width="6" height="9" rx="2" fill="#ffffff" fillOpacity="0.55" />
      <rect x="21" y="22" width="6" height="15" rx="2" fill="#ffffff" fillOpacity="0.8" />
      <rect x="31" y="15" width="6" height="22" rx="2" fill="#ffffff" />
      {/* upward trend arrow */}
      <path
        d="M12 26 L22 19 L29 23 L37 12"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M31.5 12 L37 12 L37 17.5" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({
  size = 40,
  withWordmark = true,
  className,
}: {
  size?: number
  withWordmark?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-bold tracking-tight text-foreground" style={{ fontSize: size * 0.5 }}>
          Gain<span className="text-primary">Track</span>
        </span>
      )}
    </div>
  )
}
