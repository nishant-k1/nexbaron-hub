import { createContext, useContext, useEffect, useState } from "react"
import type { Division } from "@/lib/api"

type ThemeMode = "dark" | "light"

const STORAGE_KEY = "nexbaron-hub-theme"

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch { /* ignore */ }
  return "dark"
}

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void }>({ mode: "dark", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode)
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* ignore */ }
  }, [mode])

  const toggle = () => setMode(m => m === "dark" ? "light" : "dark")
  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }

const DivisionContext = createContext<Division | null>(null)

export function DivisionProvider({ division, children }: { division: Division | null; children: React.ReactNode }) {
  useEffect(() => {
    if (division) document.documentElement.setAttribute("data-division", division)
  }, [division])
  return <DivisionContext.Provider value={division}>{children}</DivisionContext.Provider>
}

export function useDivision() { return useContext(DivisionContext) }
