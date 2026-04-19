import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { Saathiloan } from "../types/saathiloan";
import {
  getProvider,
  getCreditProfilePda,
  getLoanPda,
  getVaultPda,
  getOracleKeypair,
} from "../utils/solana";

// Import your generated IDL after running `anchor build`
// import idl from "../../idl/saathiloan.json";

// ─────────────────────────────────────────────────────────────────────────────
// Get Anchor Program instance
// ─────────────────────────────────────────────────────────────────────────────
function getProgram() {
  const provider = getProvider();

  const idl = require("../../idl/saathiloan.js").IDL as Saathiloan;
  return new anchor.Program<Saathiloan>(idl, provider);
}

export type LoanStatus =
  | "open"
  | "funded"
  | "active"
  | "repaid"
  | "defaulted"
  | "cancelled"
  | "unknown";

export interface LoanSnapshot {
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
  createdAtUnix: number;
  disbursedAtUnix: number;
  lastRepaymentAtUnix: number;
}

export interface LenderPositionSnapshot {
  pda: string;
  lender: string;
  loan: string;
  amountContributedLamports: string;
  amountReceivedLamports: string;
  fundedAtUnix: number;
}

function bnToString(value: unknown): string {
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String((value as { toString: () => string }).toString());
  }
  return "0";
}

function bnToNumber(value: unknown): number {
  const str = bnToString(value);
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLoanStatus(value: unknown): LoanStatus {
  if (typeof value !== "object" || value === null) return "unknown";
  const variants: LoanStatus[] = [
    "open",
    "funded",
    "active",
    "repaid",
    "defaulted",
    "cancelled",
  ];
  for (const variant of variants) {
    if (variant in (value as Record<string, unknown>)) return variant;
  }
  return "unknown";
}

function loanToSnapshot(
  loan: Record<string, unknown>,
  pda: PublicKey,
): LoanSnapshot {
  return {
    pda: pda.toBase58(),
    borrower: (loan.borrower as PublicKey).toBase58(),
    loanId: bnToString(loan.loanId),
    amountRequestedLamports: bnToString(loan.amountRequested),
    amountFundedLamports: bnToString(loan.amountFunded),
    amountRepaidLamports: bnToString(loan.amountRepaid),
    totalDueLamports: bnToString(loan.totalDue),
    interestBps: Number(loan.interestBps ?? 0),
    durationDays: Number(loan.durationDays ?? 0),
    creditScoreSnapshot: Number(loan.creditScoreSnapshot ?? 0),
    status: normalizeLoanStatus(loan.status),
    createdAtUnix: bnToNumber(loan.createdAt),
    disbursedAtUnix: bnToNumber(loan.disbursedAt),
    lastRepaymentAtUnix: bnToNumber(loan.lastRepaymentAt),
  };
}

function lenderPositionToSnapshot(
  position: Record<string, unknown>,
  pda: PublicKey,
): LenderPositionSnapshot {
  return {
    pda: pda.toBase58(),
    lender: (position.lender as PublicKey).toBase58(),
    loan: (position.loan as PublicKey).toBase58(),
    amountContributedLamports: bnToString(position.amountContributed),
    amountReceivedLamports: bnToString(position.amountReceived),
    fundedAtUnix: bnToNumber(position.fundedAt),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Write credit score on-chain
// Called after parsing eSewa PDF and computing score
// ─────────────────────────────────────────────────────────────────────────────
export async function writeCreditScore(
  borrowerAddress: string,
  creditScore: number,
  totalVolumeNPR: number,
  txCount: number,
): Promise<string> {
  const program = getProgram();
  const oracle = getOracleKeypair();
  const borrower = new PublicKey(borrowerAddress);
  const [creditProfilePda] = getCreditProfilePda(borrower);

  // Convert NPR to paisa (1 NPR = 100 paisa) and store as u64
  const totalVolumePaisa = Math.floor(totalVolumeNPR * 100);

  const tx = await program.methods
    .upsertCreditProfile({
      creditScore,
      totalEsewaVolumePaisa: new anchor.BN(totalVolumePaisa),
      esewaTxCount: txCount,
    })
    .accountsStrict({
      oracle: oracle.publicKey,
      borrower,
      creditProfile: creditProfilePda,
      systemProgram: SystemProgram.programId,
    })
    .signers([oracle])
    .rpc();

  console.log(
    ` Credit score ${creditScore} written on-chain for ${borrowerAddress}`,
  );
  console.log(`   Transaction: ${tx}`);
  return tx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Disburse a fully funded loan to the borrower
// ─────────────────────────────────────────────────────────────────────────────
export async function disburseLoan(
  borrowerAddress: string,
  loanId: number,
): Promise<string> {
  const program = getProgram();
  const oracle = getOracleKeypair();
  const borrower = new PublicKey(borrowerAddress);
  const [loanPda] = getLoanPda(borrower, loanId);
  const [vaultPda] = getVaultPda(loanPda);

  const tx = await program.methods
    .disburseLoan()
    .accountsStrict({
      caller: oracle.publicKey,
      borrower,
      loanRequest: loanPda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([oracle])
    .rpc();

  console.log(`✅ Loan ${loanId} disbursed to ${borrowerAddress}`);
  console.log(`   Transaction: ${tx}`);
  return tx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Record a repayment detected from eSewa
// ─────────────────────────────────────────────────────────────────────────────
export async function recordRepayment(
  borrowerAddress: string,
  loanId: number,
  amountNPR: number,
): Promise<string> {
  const program = getProgram();
  const oracle = getOracleKeypair();
  const borrower = new PublicKey(borrowerAddress);
  const [loanPda] = getLoanPda(borrower, loanId);
  const [creditProfilePda] = getCreditProfilePda(borrower);

  // Convert NPR to lamports (rough: 1 SOL ≈ NPR 13,000, adjust for your rate)
  // In production: use a live SOL/NPR price feed
  const SOL_TO_NPR_RATE = 13000;
  const amountLamports = Math.floor(
    (amountNPR / SOL_TO_NPR_RATE) * anchor.web3.LAMPORTS_PER_SOL,
  );

  const tx = await program.methods
    .recordRepayment(new anchor.BN(amountLamports))
    .accountsStrict({
      oracle: oracle.publicKey,
      borrower,
      loanRequest: loanPda,
      creditProfile: creditProfilePda,
      systemProgram: SystemProgram.programId,
    })
    .signers([oracle])
    .rpc();

  console.log(` Repayment of NPR ${amountNPR} recorded for loan ${loanId}`);
  console.log(`   Transaction: ${tx}`);
  return tx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch a borrower's credit profile from chain (read-only)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchCreditProfile(borrowerAddress: string) {
  const program = getProgram();
  const borrower = new PublicKey(borrowerAddress);
  const [creditProfilePda] = getCreditProfilePda(borrower);

  try {
    const profile = await program.account.creditProfile.fetch(creditProfilePda);
    return profile;
  } catch {
    return null; // profile doesn't exist yet
  }
}

export async function fetchLoanRequest(
  borrowerAddress: string,
  loanId: number,
): Promise<LoanSnapshot | null> {
  const program = getProgram();
  const borrower = new PublicKey(borrowerAddress);
  const [loanPda] = getLoanPda(borrower, loanId);

  try {
    const loan = (await program.account.loanRequest.fetch(
      loanPda,
    )) as unknown as Record<string, unknown>;
    return loanToSnapshot(loan, loanPda);
  } catch {
    return null;
  }
}

export async function fetchAllLoans(): Promise<LoanSnapshot[]> {
  const program = getProgram();
  const loans = await program.account.loanRequest.all();
  return loans.map((entry) =>
    loanToSnapshot(
      entry.account as unknown as Record<string, unknown>,
      entry.publicKey,
    ),
  );
}

export async function fetchBorrowerLoans(
  borrowerAddress: string,
): Promise<LoanSnapshot[]> {
  const borrower = new PublicKey(borrowerAddress).toBase58();
  const loans = await fetchAllLoans();
  return loans.filter((loan) => loan.borrower === borrower);
}

export async function fetchOpenLoans(): Promise<LoanSnapshot[]> {
  const loans = await fetchAllLoans();
  return loans.filter((loan) => loan.status === "open");
}

export async function fetchLenderPositions(
  lenderAddress: string,
): Promise<LenderPositionSnapshot[]> {
  const program = getProgram();
  const lender = new PublicKey(lenderAddress).toBase58();
  const positions = await program.account.lenderPosition.all();

  return positions
    .map((entry) =>
      lenderPositionToSnapshot(
        entry.account as unknown as Record<string, unknown>,
        entry.publicKey,
      ),
    )
    .filter((position) => position.lender === lender);
}
