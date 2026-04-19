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
