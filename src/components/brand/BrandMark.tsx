import { cn } from "@/lib/cn"
import { useDivision } from "@/theme/theme-provider"

interface BrandMarkProps { size?: number; className?: string }

const TILE: Record<"digital" | "print", string> = {
  digital: "bg-gradient-to-tr from-teal-500 to-cyan-400",
  print: "bg-gradient-to-tr from-amber-500 to-orange-500",
}

export function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  const division = useDivision()

  return (
    <div
      style={{ width: size, height: size }}
      className={cn("rounded-xl p-0.5 shadow-lg", TILE[division ?? "digital"], className)}
    >
      <div className="w-full h-full bg-slate-950 rounded-[calc(0.75rem-2px)] flex items-center justify-center">
        <svg viewBox="0 0 24 24" style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true">
          <g fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 4 V20" />
            <path d="M18.5 4 V20" />
            <path d="M5.5 4 L18.5 20" />
          </g>
        </svg>
      </div>
    </div>
  )
}