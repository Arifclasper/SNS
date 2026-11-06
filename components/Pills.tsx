import { stockState } from "@/lib/utils";

const STYLES = {
  in: "bg-success-soft text-success",
  low: "bg-warning-soft text-warning",
  out: "bg-danger-soft text-danger",
} as const;

const LABEL = {
  in: "In stock",
  low: "Low stock",
  out: "Out of stock",
} as const;

export function StockPill({
  stock,
  threshold,
  stockOnly = false,
}: {
  stock: number;
  threshold: number;
  stockOnly?: boolean;
}) {
  const state = stockState(stock, threshold);
  return (
    <span className={`pill ${STYLES[state]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {stockOnly ? LABEL[state] : `${LABEL[state]} · ${stock}`}
    </span>
  );
}

export function StatusPill({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const style =
    status === "active"
      ? "bg-success-soft text-success"
      : "bg-sunken text-muted";
  return (
    <span className={`pill ${style} ${className}`}>
      {status === "active" ? "Active" : "Draft"}
    </span>
  );
}
