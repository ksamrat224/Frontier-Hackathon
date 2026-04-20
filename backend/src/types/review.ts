export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRecord {
  borrowerAddress: string;
  loanId: number;
  status: ReviewStatus;
  notes?: string;
  updatedAt: string;
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}
