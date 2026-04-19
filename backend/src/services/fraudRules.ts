import type { LoanSnapshot } from "./solanaOracle";

export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudDecision = "allow" | "review" | "block";

export interface FraudAssessment {
  score: number;
  severity: FraudSeverity;
  decision: FraudDecision;
  reasons: string[];
}

interface FraudInput {
  loan?: LoanSnapshot | null;
  amountNPR?: number;
}

const MAX_SCORE = 100;

function clampScore(value: number): number {
  return Math.max(0, Math.min(MAX_SCORE, value));
}

export function assessFraudRisk(input: FraudInput): FraudAssessment {
  let score = 0;
  const reasons: string[] = [];

  if (input.loan) {
    const requestedLamports = Number(input.loan.amountRequestedLamports);
    const requestedSol = requestedLamports / 1_000_000_000;

    if (requestedSol > 50) {
      score += 30;
      reasons.push("Large loan amount requested (>50 SOL)");
    }

    if (input.loan.creditScoreSnapshot < 350) {
      score += 35;
      reasons.push("Credit score near eligibility threshold");
    }

    if (input.loan.status === "defaulted") {
      score += 40;
      reasons.push("Loan already marked as defaulted");
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const ageSeconds = Math.max(0, nowUnix - input.loan.createdAtUnix);
    const ageDays = ageSeconds / 86400;

    if (ageDays < 1 && requestedSol > 10) {
      score += 15;
      reasons.push("Large loan progressed unusually quickly");
    }
  }

  if (typeof input.amountNPR === "number") {
    if (input.amountNPR > 200_000) {
      score += 25;
      reasons.push("Very high single repayment amount (NPR)");
    }

    if (input.amountNPR < 100) {
      score += 10;
      reasons.push("Repayment amount unusually small");
    }
  }

  const normalized = clampScore(score);

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
