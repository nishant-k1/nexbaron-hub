import { cloneElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface DropdownProps {
  trigger: ReactElement
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: "left" | "right"
  menuClassName?: string
  "aria-label"?: string
}

export function Dropdown({ trigger, children, align = "right", menuClassName, "aria-label": ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  const Trigger = cloneElement(trigger, {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: (e: React.MouseEvent) => {
      const original = (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick
      original?.(e)
      setOpen((o) => !o)
    },
  } as Partial<typeof trigger.props>)

  return (
    <div ref={rootRef} className="relative">
      {Trigger}
      {open && (
        <div
          role="menu"
          aria-label={ariaLabel}
          className={cn(
            "absolute top-full mt-2 z-50 min-w-[12rem] bg-neutral-surface border border-border rounded-xl shadow-2xl overflow-hidden",
            align === "right" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  )
}
