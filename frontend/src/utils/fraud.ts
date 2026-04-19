import type { Fraud, Loan } from "../types/app";

export function assessFraud(loan: Loan): Fraud {
  let score = 0;
  const reasons: string[] = [];

  const requestedSol = Number(loan.amountRequestedLamports) / 1_000_000_000;
  if (requestedSol > 50) {
    score += 30;
    reasons.push("Large loan amount requested (>50 SOL)");
  }

  if (loan.creditScoreSnapshot < 350) {
    score += 35;
    reasons.push("Credit score close to minimum eligibility");
  }

  if (loan.status === "defaulted") {
    score += 40;
    reasons.push("Loan status already defaulted");
  }

  const normalized = Math.max(0, Math.min(100, score));
  if (normalized >= 70) {
    return {
      score: normalized,
      severity: "critical",
      decision: "block",
      reasons,
    };
  }

  if (normalized >= 45) {
    return {
      score: normalized,
      severity: "high",
      decision: "review",
      reasons,
    };
  }

  if (normalized >= 20) {
    return {
      score: normalized,
      severity: "medium",
      decision: "allow",
      reasons,
    };
  }

  return {
    score: normalized,
    severity: "low",
    decision: "allow",
    reasons: reasons.length > 0 ? reasons : ["No major fraud indicators"],
  };
}
