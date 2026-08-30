/** Billing view types — must match nexbaron-api buildBillingView() output. */

export type BillingTone = "success" | "warning" | "muted" | "danger";

export interface BillingStatusChip {
  label: string;
  tone: BillingTone;
}

export interface BillingView {
  oneTimeTotal: number;
  oneTimePaid: number;
  oneTimeDue: number;
  oneTimePaidPercent: number;
  recurringTotal: number;
  recurringPaid: number;
  recurringDue: number;
  totalPaid: number;
  amountDue: number;
  paidPercent: number;
  displayStatus: BillingStatusChip & { phase: string };
  oneTimeStatus: BillingStatusChip & { dueAmount: number };
  recurringStatus: BillingStatusChip & { dueAmount: number };
  recurringNote: string;
  oneTimeItems: Array<{ label: string; amount: number; type: string }>;
  recurringItems: Array<{ label: string; amount: number; type: string }>;
}

export const BILLING_TONE_CLS: Record<BillingTone, string> = {
  success: "bg-emerald-500/15 text-emerald-600",
  warning: "bg-amber-500/15 text-amber-600",
  muted: "bg-neutral-bg text-muted",
  danger: "bg-red-500/15 text-red-600",
};

export function billingStatusLabel(chip: BillingStatusChip & { dueAmount?: number }, inr?: Intl.NumberFormat): string {
  if (chip.label === "Due" && chip.dueAmount != null && chip.dueAmount > 0 && inr) {
    return `${inr.format(chip.dueAmount)} due`;
  }
  return chip.label;
}
