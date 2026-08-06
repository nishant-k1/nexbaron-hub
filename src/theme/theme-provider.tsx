import { createContext, useContext, useEffect, useState } from "react"
import type { Division } from "@/lib/api"

type ThemeMode = "dark" | "light"

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void }>({ mode: "dark", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark")
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode)
  }, [mode])
  const toggle = () => setMode(m => m === "dark" ? "light" : "dark")
  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }

// Extract division from pathname for layout use
const DivisionContext = createContext<Division | null>(null)

export function DivisionProvider({ division, children }: { division: Division | null; children: React.ReactNode }) {
  return <DivisionContext.Provider value={division}>{children}</DivisionContext.Provider>
}

export function useDivision() { return useContext(DivisionContext) }
