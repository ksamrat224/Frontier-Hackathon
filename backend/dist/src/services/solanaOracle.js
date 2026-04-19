"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCreditScore = writeCreditScore;
exports.disburseLoan = disburseLoan;
exports.recordRepayment = recordRepayment;
exports.fetchCreditProfile = fetchCreditProfile;
exports.fetchLoanRequest = fetchLoanRequest;
exports.fetchAllLoans = fetchAllLoans;
exports.fetchBorrowerLoans = fetchBorrowerLoans;
exports.fetchOpenLoans = fetchOpenLoans;
exports.fetchLenderPositions = fetchLenderPositions;
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("../utils/solana");
// Import your generated IDL after running `anchor build`
// import idl from "../../idl/saathiloan.json";
// ─────────────────────────────────────────────────────────────────────────────
// Get Anchor Program instance
// ─────────────────────────────────────────────────────────────────────────────
function getProgram() {
    const provider = (0, solana_1.getProvider)();
    const idl = require("../../idl/saathiloan.js").IDL;
    return new anchor.Program(idl, provider);
}
function bnToString(value) {
    if (typeof value === "object" && value !== null && "toString" in value) {
        return String(value.toString());
    }
    return "0";
}
function bnToNumber(value) {
    const str = bnToString(value);
    const parsed = Number(str);
    return Number.isFinite(parsed) ? parsed : 0;
}
function normalizeLoanStatus(value) {
    if (typeof value !== "object" || value === null)
        return "unknown";
    const variants = [
        "open",
        "funded",
        "active",
        "repaid",
        "defaulted",
        "cancelled",
    ];
    for (const variant of variants) {
        if (variant in value)
            return variant;
    }
    return "unknown";
}
function loanToSnapshot(loan, pda) {
    return {
        pda: pda.toBase58(),
        borrower: loan.borrower.toBase58(),
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
function lenderPositionToSnapshot(position, pda) {
    return {
        pda: pda.toBase58(),
        lender: position.lender.toBase58(),
        loan: position.loan.toBase58(),
        amountContributedLamports: bnToString(position.amountContributed),
        amountReceivedLamports: bnToString(position.amountReceived),
        fundedAtUnix: bnToNumber(position.fundedAt),
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// Write credit score on-chain
// Called after parsing eSewa PDF and computing score
// ─────────────────────────────────────────────────────────────────────────────
async function writeCreditScore(borrowerAddress, creditScore, totalVolumeNPR, txCount) {
    const program = getProgram();
    const oracle = (0, solana_1.getOracleKeypair)();
    const borrower = new web3_js_1.PublicKey(borrowerAddress);
    const [creditProfilePda] = (0, solana_1.getCreditProfilePda)(borrower);
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
        systemProgram: web3_js_1.SystemProgram.programId,
    })
        .signers([oracle])
        .rpc();
    console.log(` Credit score ${creditScore} written on-chain for ${borrowerAddress}`);
    console.log(`   Transaction: ${tx}`);
    return tx;
}
// ─────────────────────────────────────────────────────────────────────────────
// Disburse a fully funded loan to the borrower
// ─────────────────────────────────────────────────────────────────────────────
async function disburseLoan(borrowerAddress, loanId) {
    const program = getProgram();
    const oracle = (0, solana_1.getOracleKeypair)();
    const borrower = new web3_js_1.PublicKey(borrowerAddress);
    const [loanPda] = (0, solana_1.getLoanPda)(borrower, loanId);
    const [vaultPda] = (0, solana_1.getVaultPda)(loanPda);
    const tx = await program.methods
        .disburseLoan()
        .accountsStrict({
        caller: oracle.publicKey,
        borrower,
        loanRequest: loanPda,
        vault: vaultPda,
        systemProgram: web3_js_1.SystemProgram.programId,
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
async function recordRepayment(borrowerAddress, loanId, amountNPR) {
    const program = getProgram();
    const oracle = (0, solana_1.getOracleKeypair)();
    const borrower = new web3_js_1.PublicKey(borrowerAddress);
    const [loanPda] = (0, solana_1.getLoanPda)(borrower, loanId);
    const [creditProfilePda] = (0, solana_1.getCreditProfilePda)(borrower);
    // Convert NPR to lamports (rough: 1 SOL ≈ NPR 13,000, adjust for your rate)
    // In production: use a live SOL/NPR price feed
    const SOL_TO_NPR_RATE = 13000;
    const amountLamports = Math.floor((amountNPR / SOL_TO_NPR_RATE) * anchor.web3.LAMPORTS_PER_SOL);
    const tx = await program.methods
        .recordRepayment(new anchor.BN(amountLamports))
        .accountsStrict({
        oracle: oracle.publicKey,
        borrower,
        loanRequest: loanPda,
        creditProfile: creditProfilePda,
        systemProgram: web3_js_1.SystemProgram.programId,
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
async function fetchCreditProfile(borrowerAddress) {
    const program = getProgram();
    const borrower = new web3_js_1.PublicKey(borrowerAddress);
    const [creditProfilePda] = (0, solana_1.getCreditProfilePda)(borrower);
    try {
        const profile = await program.account.creditProfile.fetch(creditProfilePda);
        return profile;
    }
    catch {
        return null; // profile doesn't exist yet
    }
}
async function fetchLoanRequest(borrowerAddress, loanId) {
    const program = getProgram();
    const borrower = new web3_js_1.PublicKey(borrowerAddress);
    const [loanPda] = (0, solana_1.getLoanPda)(borrower, loanId);
    try {
        const loan = (await program.account.loanRequest.fetch(loanPda));
        return loanToSnapshot(loan, loanPda);
    }
    catch {
        return null;
    }
}
async function fetchAllLoans() {
    const program = getProgram();
    const loans = await program.account.loanRequest.all();
    return loans.map((entry) => loanToSnapshot(entry.account, entry.publicKey));
}
async function fetchBorrowerLoans(borrowerAddress) {
    const borrower = new web3_js_1.PublicKey(borrowerAddress).toBase58();
    const loans = await fetchAllLoans();
    return loans.filter((loan) => loan.borrower === borrower);
}
async function fetchOpenLoans() {
    const loans = await fetchAllLoans();
    return loans.filter((loan) => loan.status === "open");
}
async function fetchLenderPositions(lenderAddress) {
    const program = getProgram();
    const lender = new web3_js_1.PublicKey(lenderAddress).toBase58();
    const positions = await program.account.lenderPosition.all();
    return positions
        .map((entry) => lenderPositionToSnapshot(entry.account, entry.publicKey))
        .filter((position) => position.lender === lender);
}
