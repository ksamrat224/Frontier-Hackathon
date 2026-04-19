export type LoanStatus =
  | "open"
  | "funded"
  | "active"
  | "repaid"
  | "defaulted"
  | "cancelled"
  | "unknown";

export interface Loan {
  pda: string;
  borrower: string;
  loanId: string;
  amountRequestedLamports: string;
  amountFundedLamports: string;
  amountRepaidLamports: string;
  totalDueLamports: string;
  interestBps: number;
  durationDays: number;
  creditScoreSnapshot: number;
  status: LoanStatus;
}

export interface Review {
  borrowerAddress: string;
  loanId: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  updatedAt: string;
}

export interface LoanDetailResponse {
  loan: Loan;
  review: Review | null;
}

export interface Position {
  pda: string;
  lender: string;
  loan: string;
  amountContributedLamports: string;
  amountReceivedLamports: string;
  fundedAtUnix: number;
}

export interface Fraud {
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  decision: "allow" | "review" | "block";
  reasons: string[];
}

export interface ActivityItem {
  id: string;
  title: string;
  details: string;
  createdAt: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export type ActivityEventInput = Omit<ActivityItem, "id" | "createdAt">;
