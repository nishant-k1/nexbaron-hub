interface BrandMarkProps { size?: number; className?: string }

export function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  return (
    <div className={`rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-400 to-amber-500 p-0.5 shadow-lg ${className}`}>
      <div className="w-full h-full bg-neutral-bg rounded-[10px] flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <g fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 4 V20" />
            <path d="M18.5 4 V20" />
            <path d="M5.5 4 L18.5 20" />
          </g>
        </svg>
      </div>
    </div>
  )
}
