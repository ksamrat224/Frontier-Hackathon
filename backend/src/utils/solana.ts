import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import dotenv from "dotenv";

dotenv.config();

// ── Connection ─────────────────────────────────────────────────────────────
export const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl("devnet"),
  "confirmed",
);

// ── Oracle Keypair ─────────────────────────────────────────────────────────
// Loaded from ORACLE_KEYPAIR env variable (the JSON array from oracle-keypair.json)
export function getOracleKeypair(): Keypair {
  const raw = process.env.ORACLE_KEYPAIR;
  if (!raw) throw new Error("ORACLE_KEYPAIR env variable not set");
  const bytes = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

// ── Program ID ────────────────────────────────────────────────────────────
export function getProgramId(): PublicKey {
  const id = process.env.PROGRAM_ID;
  if (!id) throw new Error("PROGRAM_ID env variable not set");
  return new PublicKey(id);
}

// ── Anchor Provider ───────────────────────────────────────────────────────
export function getProvider(): anchor.AnchorProvider {
  const oracle = getOracleKeypair();
  const wallet = new anchor.Wallet(oracle);
  return new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
}

// ── PDA helpers ───────────────────────────────────────────────────────────
export function getCreditProfilePda(borrower: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credit"), borrower.toBuffer()],
    getProgramId(),
  );
}

export function getLoanPda(
  borrower: PublicKey,
  loanId: number,
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(loanId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), borrower.toBuffer(), idBuffer],
    getProgramId(),
  );
}

export function getVaultPda(loanPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), loanPda.toBuffer()],
    getProgramId(),
  );
}
