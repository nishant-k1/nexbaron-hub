import { useState, useEffect, createContext, useContext } from "react"
import { useDivision } from "@/theme/theme-provider"
import { apiRequest, type Division } from "./api"

export interface MetadataResponse {
  statuses: Record<string, string[]>
  labels: Record<string, Record<string, string>>
}

const MetadataContext = createContext<MetadataResponse | null>(null)

export function MetadataProvider({ children }: { children: React.ReactNode }) {
  const division = useDivision()
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null)

  useEffect(() => {
    if (!division) return
    let active = true
    apiRequest<MetadataResponse>("/metadata", {}, division as Division)
      .then((d) => { if (active) setMetadata(d) })
      .catch(() => {})
    return () => { active = false }
  }, [division])

  return (
    <MetadataContext.Provider value={metadata}>
      {children}
    </MetadataContext.Provider>
  )
}

export function useMetadata(): MetadataResponse | null {
  return useContext(MetadataContext)
}

export function useEntityLabels(entity: string): Record<string, string> {
  const metadata = useMetadata()
  return metadata?.labels?.[entity] ?? {}
}
