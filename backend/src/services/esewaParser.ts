import pdfParse from "pdf-parse";
import fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface EsewaTransaction {
  date: string;
  description: string;
  amount: number; // in NPR
  type: "credit" | "debit";
}

export interface EsewaProfile {
  transactions: EsewaTransaction[];
  totalVolumeNPR: number; // total money moved (credits + debits)
  txCount: number;
  monthlyAvgNPR: number;
  oldestTxDate: string;
  newestTxDate: string;
}

export interface CreditScoreResult {
  score: number; // 0 – 1000
  breakdown: {
    volumeScore: number; // max 300
    frequencyScore: number; // max 300
    consistencyScore: number; // max 200
    historyLengthScore: number; // max 200
  };
  totalVolumeNPR: number;
  txCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse eSewa PDF statement
//
// eSewa statements look like:
//   Date        | Description              | Amount   | Type
//   2024-01-15  | Sent to Ram Bahadur      | 500.00   | Debit
//   2024-01-16  | Received from Sita       | 1000.00  | Credit
//
// This parser handles the common eSewa statement format.
// You may need to tweak the regex based on the exact PDF layout.
// ─────────────────────────────────────────────────────────────────────────────
export async function parseEsewaPdf(filePath: string): Promise<EsewaProfile> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const text = data.text;

  const transactions: EsewaTransaction[] = [];

  // Match lines like: "2024-01-15  Payment to merchant  500.00  Dr"
  // eSewa uses Dr (debit) and Cr (credit) in their statements
  const lineRegex =
    /(\d{4}[-\/]\d{2}[-\/]\d{2})\s+(.+?)\s+([\d,]+\.?\d*)\s+(Dr|Cr|Debit|Credit)/gi;

  let match;
  while ((match = lineRegex.exec(text)) !== null) {
    const [, date, description, amountStr, typeStr] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    const type = typeStr.toLowerCase().startsWith("cr") ? "credit" : "debit";

    if (!isNaN(amount) && amount > 0) {
      transactions.push({
        date,
        description: description.trim(),
        amount,
        type,
      });
    }
  }

  // If regex didn't match (different PDF format), try a simpler amount extraction
  if (transactions.length === 0) {
    console.warn(
      "⚠️  Primary regex found no transactions. Trying fallback parser...",
    );
    return fallbackParse(text);
  }

  const totalVolumeNPR = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const txCount = transactions.length;

  // Get date range
  const dates = transactions.map((tx) => tx.date).sort();
  const oldestTxDate = dates[0] || "";
  const newestTxDate = dates[dates.length - 1] || "";

  // Calculate monthly average
  const monthsSpan = getMonthSpan(oldestTxDate, newestTxDate) || 1;
  const monthlyAvgNPR = totalVolumeNPR / monthsSpan;

  return {
    transactions,
    totalVolumeNPR,
    txCount,
    monthlyAvgNPR,
    oldestTxDate,
    newestTxDate,
  };
}

// Fallback: just count amounts in the PDF if table structure varies
function fallbackParse(text: string): EsewaProfile {
  const amountRegex = /NPR\s*([\d,]+\.?\d*)/gi;
  const amounts: number[] = [];
  let match;

  while ((match = amountRegex.exec(text)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ""));
    if (!isNaN(amount) && amount > 0) amounts.push(amount);
  }

  const totalVolumeNPR = amounts.reduce((sum, a) => sum + a, 0);
  const txCount = amounts.length;

  return {
    transactions: [],
    totalVolumeNPR,
    txCount,
    monthlyAvgNPR: totalVolumeNPR / 6, // assume 6 months if unknown
    oldestTxDate: "",
    newestTxDate: "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute Credit Score from eSewa profile
//
// Score breakdown (total 1000):
//   Volume score     (300 pts): how much money flows through eSewa
//   Frequency score  (300 pts): how many transactions
//   Consistency      (200 pts): regular monthly activity vs sporadic
//   History length   (200 pts): how long they've been using eSewa
// ─────────────────────────────────────────────────────────────────────────────
export function computeCreditScore(profile: EsewaProfile): CreditScoreResult {
  // ── Volume Score (max 300) ─────────────────────────────────────────────────
  // NPR tiers: 500k+ = full, 200k = 200, 100k = 150, 50k = 100, 10k = 50
  let volumeScore = 0;
  const vol = profile.totalVolumeNPR;
  if (vol >= 500_000) volumeScore = 300;
  else if (vol >= 200_000) volumeScore = 220;
  else if (vol >= 100_000) volumeScore = 160;
  else if (vol >= 50_000) volumeScore = 110;
  else if (vol >= 10_000) volumeScore = 60;
  else volumeScore = 20;

  // ── Frequency Score (max 300) ─────────────────────────────────────────────
  // 100+ transactions = full, scales down
  let frequencyScore = 0;
  const count = profile.txCount;
  if (count >= 100) frequencyScore = 300;
  else if (count >= 50) frequencyScore = 220;
  else if (count >= 20) frequencyScore = 150;
  else if (count >= 10) frequencyScore = 90;
  else if (count >= 5) frequencyScore = 50;
  else frequencyScore = 10;

  // ── Consistency Score (max 200) ───────────────────────────────────────────
  // Monthly average > 5k NPR = good, means regular usage
  let consistencyScore = 0;
  const avg = profile.monthlyAvgNPR;
  if (avg >= 50_000) consistencyScore = 200;
  else if (avg >= 20_000) consistencyScore = 160;
  else if (avg >= 5_000) consistencyScore = 110;
  else if (avg >= 1_000) consistencyScore = 60;
  else consistencyScore = 20;

  // ── History Length Score (max 200) ────────────────────────────────────────
  // 2+ years of eSewa history = full marks
  const months = getMonthSpan(profile.oldestTxDate, profile.newestTxDate);
  let historyLengthScore = 0;
  if (months >= 24) historyLengthScore = 200;
  else if (months >= 12) historyLengthScore = 150;
  else if (months >= 6) historyLengthScore = 100;
  else if (months >= 3) historyLengthScore = 60;
  else historyLengthScore = 20;

  const score = Math.min(
    1000,
    volumeScore + frequencyScore + consistencyScore + historyLengthScore,
  );

  return {
    score,
    breakdown: {
      volumeScore,
      frequencyScore,
      consistencyScore,
      historyLengthScore,
    },
    totalVolumeNPR: profile.totalVolumeNPR,
    txCount: profile.txCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: calculate month span between two date strings
// ─────────────────────────────────────────────────────────────────────────────
function getMonthSpan(from: string, to: string): number {
  if (!from || !to) return 1;
  try {
    const start = new Date(from);
    const end = new Date(to);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return Math.max(1, months);
  } catch {
    return 1;
  }
}
