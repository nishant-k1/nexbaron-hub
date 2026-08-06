export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="text-xs font-medium text-heading block mb-1.5">{children}</label>
}
