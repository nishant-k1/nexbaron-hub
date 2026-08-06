import { forwardRef } from "react"

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full px-3 py-2.5 rounded-lg bg-neutral-bg border border-border text-heading text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors ${className}`}
      {...props}
    />
  )
)
Input.displayName = "Input"
