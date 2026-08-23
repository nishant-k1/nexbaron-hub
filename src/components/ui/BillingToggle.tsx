import { useDivision } from "@/theme/theme-provider";

type BillingCycleChoice = "monthly" | "annual";

interface BillingToggleProps {
  value: BillingCycleChoice;
  onChange: (cycle: BillingCycleChoice) => void;
  className?: string;
}

export function BillingToggle({
  value,
  onChange,
  className = "",
}: BillingToggleProps) {
  const division = useDivision();
  const active =
    division === "digital"
      ? "bg-accent text-accent-fg"
      : "bg-amber-500 text-white";
  const idle = "text-muted hover:text-heading";

  return (
    <div
      role="tablist"
      aria-label="Billing cycle"
      className={`inline-flex items-center gap-1 p-1 rounded-xl border border-border bg-neutral-surface ${className}`}
    >
      {(["monthly", "annual"] as const).map((cycle) => (
        <button
          key={cycle}
          type="button"
          role="tab"
          aria-selected={value === cycle}
          onClick={() => onChange(cycle)}
          className={`cursor-pointer px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            value === cycle ? active : idle
          }`}
        >
          {cycle === "monthly" ? "Monthly" : "Annual"}
        </button>
      ))}
    </div>
  );
}