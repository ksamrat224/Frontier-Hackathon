use anchor_lang::prelude::*;

// ─────────────────────────────────────────────────────────────────────────────
// CreditProfile
// PDA seeds: ["credit", borrower_pubkey]
//
// Written by your trusted oracle backend after verifying the borrower's
// eSewa transaction history. This is the on-chain "credit score" that
// lenders can read before deciding to fund a loan.
// ─────────────────────────────────────────────────────────────────────────────
#[account]
pub struct CreditProfile {
    /// The wallet that owns this credit profile
    pub borrower: Pubkey,             // 32

    /// Score from 0–1000 computed from eSewa history
    /// 0–299 = poor, 300–599 = fair, 600–799 = good, 800+ = excellent
    pub credit_score: u16,            // 2

    /// Total lifetime volume of eSewa transactions (in NPR paisa, to avoid floats)
    pub total_esewa_volume_paisa: u64, // 8

    /// Number of eSewa transactions verified
    pub esewa_tx_count: u32,          // 4

    /// Number of loans repaid on time (on this platform)
    pub loans_repaid_on_time: u16,    // 2

    /// Number of loans defaulted (late by > 30 days)
    pub loans_defaulted: u16,         // 2

    /// UNIX timestamp of last oracle update
    pub last_updated: i64,            // 8

    /// Bump for PDA derivation
    pub bump: u8,                     // 1
}                                     // total: 59 bytes + 8 discriminator = 67

impl CreditProfile {
    pub const LEN: usize = 8 + 32 + 2 + 8 + 4 + 2 + 2 + 8 + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// LoanRequest
// PDA seeds: ["loan", borrower_pubkey, loan_id (u64 as le_bytes)]
//
// Created by the borrower. Lenders browse these. The escrow vault is a
// separate system account (token account or native SOL account) derived
// from the same seeds with an extra "vault" seed.
// ─────────────────────────────────────────────────────────────────────────────
#[account]
pub struct LoanRequest {
    /// Borrower's wallet
    pub borrower: Pubkey,             // 32

    /// Monotonically increasing ID per borrower (from CreditProfile)
    pub loan_id: u64,                 // 8

    /// Amount requested in lamports (1 SOL = 1_000_000_000 lamports)
    pub amount_requested: u64,        // 8

    /// Total amount funded so far (sum of all lender contributions)
    pub amount_funded: u64,           // 8

    /// Interest rate in basis points (e.g. 1200 = 12.00% annual)
    pub interest_bps: u16,            // 2

    /// Loan duration in days
    pub duration_days: u16,           // 2

    /// Credit score at time of loan creation (snapshot)
    pub credit_score_snapshot: u16,   // 2

    /// Current state of this loan
    pub status: LoanStatus,           // 1

    /// UNIX timestamp when loan was created
    pub created_at: i64,              // 8

    /// UNIX timestamp when loan was fully funded and disbursed
    pub disbursed_at: i64,            // 8

    /// UNIX timestamp of last repayment
    pub last_repayment_at: i64,       // 8

    /// Total amount repaid so far (lamports)
    pub amount_repaid: u64,           // 8

    /// Total amount due (principal + interest, computed at disbursal)
    pub total_due: u64,               // 8

    /// Bump for PDA derivation
    pub bump: u8,                     // 1
}                                     // total: ~114 bytes

impl LoanRequest {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 2 + 2 + 2 + 1 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LoanStatus {
    /// Accepting lender contributions
    Open,
    /// Fully funded, awaiting disbursal
    Funded,
    /// SOL sent to borrower, repayment expected
    Active,
    /// Fully repaid - lenders have been paid out
    Repaid,
    /// Borrower missed payments, marked as default
    Defaulted,
    /// Cancelled by borrower before funding
    Cancelled,
}

// ─────────────────────────────────────────────────────────────────────────────
// LenderPosition
// PDA seeds: ["position", loan_pubkey, lender_pubkey]
//
// Tracks how much a specific lender contributed to a specific loan.
// Used to calculate pro-rata repayments back to each lender.
// ─────────────────────────────────────────────────────────────────────────────
#[account]
pub struct LenderPosition {
    /// The lender's wallet
    pub lender: Pubkey,               // 32

    /// The loan this position is for
    pub loan: Pubkey,                 // 32

    /// How much this lender contributed (lamports)
    pub amount_contributed: u64,      // 8

    /// How much has been repaid to this lender so far (lamports)
    pub amount_received: u64,         // 8

    /// UNIX timestamp of contribution
    pub funded_at: i64,               // 8

    /// Bump
    pub bump: u8,                     // 1
}

impl LenderPosition {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}