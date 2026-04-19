import type { LoanStatus } from "../../types/app";

export function StatusBadge({ status }: { status: LoanStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
