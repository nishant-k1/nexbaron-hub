export type SearchMode = "all" | "id" | "status" | "date" | "amount";

export interface SearchFilters {
  mode: SearchMode;
  query: string;
  dateFrom?: string;
  dateTo?: string;
  dateField?: "createdAt" | "dueDate" | "acceptedAt" | "launchDate";
  amountMin?: number;
  amountMax?: number;
}

export const SEARCH_MODES: { value: SearchMode; label: string; description: string }[] = [
  { value: "all", label: "All Fields", description: "Search across all searchable fields" },
  { value: "id", label: "ID Only", description: "Search by ID fields only" },
  { value: "status", label: "Status Only", description: "Filter by status" },
  { value: "date", label: "Date Range", description: "Filter by date range" },
  { value: "amount", label: "Amount Range", description: "Filter by amount range" },
];

export function matchesSearch(item: Record<string, unknown>, filters: SearchFilters): boolean {
  const { mode, query, dateFrom, dateTo, dateField, amountMin, amountMax } = filters;

  if (mode === "id") {
    return searchById(item, query);
  }
  if (mode === "status") {
    return searchByStatus(item, query);
  }
  if (mode === "date") {
    return searchByDate(item, dateFrom, dateTo, dateField);
  }
  if (mode === "amount") {
    return searchByAmount(item, amountMin, amountMax);
  }

  return searchAllFields(item, query);
}

function searchById(item: Record<string, unknown>, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  
  const idFields = ["_id", "id", "invoiceNumber", "projectId", "proposalCode", "packageId", "orderId"];
  return idFields.some(field => {
    const val = item[field];
    return val && String(val).toLowerCase().includes(q);
  });
}

function searchByStatus(item: Record<string, unknown>, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  
  const statusVal = item.status || item.Status;
  return Boolean(statusVal && String(statusVal).toLowerCase().includes(q));
}

function searchByDate(item: Record<string, unknown>, from?: string, to?: string, field?: "createdAt" | "dueDate" | "acceptedAt" | "launchDate"): boolean {
  if (!from && !to) return true;
  
  const dateFields = field ? [field] : ["createdAt", "dueDate", "acceptedAt", "launchDate", "updatedAt"];
  
  for (const f of dateFields) {
    const val = item[f];
    if (!val) continue;
    const date = new Date(String(val));
    if (isNaN(date.getTime())) continue;
    
    if (from && date < new Date(from)) return false;
    if (to && date > new Date(to + "T23:59:59")) return false;
    return true;
  }
  return false;
}

function searchByAmount(item: Record<string, unknown>, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true;
  
  const amountVal = item.amount || item.totalAmount || item.total;
  if (amountVal === undefined) return false;
  
  const amount = Number(amountVal);
  if (isNaN(amount)) return false;
  
  if (min !== undefined && amount < min) return false;
  if (max !== undefined && amount > max) return false;
  return true;
}

function searchAllFields(item: Record<string, unknown>, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  
  const searchableFields = [
    "_id", "id", "invoiceNumber", "projectId", "proposalCode", "packageId", "orderId",
    "title", "status", "packageId", "service",
    "customer.name", "customer.email",
    "createdAt", "dueDate", "acceptedAt", "launchDate",
  ];
  
  return searchableFields.some(field => {
    const val = getNestedValue(item, field);
    return val && String(val).toLowerCase().includes(q);
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | number | boolean | null | undefined {
  let current: Record<string, unknown> | undefined = obj;
  for (const part of path.split(".")) {
    if (current === undefined) return undefined;
    current = current[part] as Record<string, unknown> | undefined;
  }
  return current as string | number | boolean | null | undefined;
}

export function getQuickDatePresets(): { label: string; from: string; to: string }[] {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];
  
  const last7 = new Date(today);
  last7.setDate(today.getDate() - 7);
  
  const last30 = new Date(today);
  last30.setDate(today.getDate() - 30);
  
  const last90 = new Date(today);
  last90.setDate(today.getDate() - 90);
  
  return [
    { label: "Last 7 days", from: format(last7), to: format(today) },
    { label: "Last 30 days", from: format(last30), to: format(today) },
    { label: "Last 90 days", from: format(last90), to: format(today) },
  ];
}