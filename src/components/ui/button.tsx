import { forwardRef } from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", size = "default", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg bg-accent text-accent-fg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 ${size === "lg" ? "h-11 px-6" : "h-9 px-4"} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = "Button"
