use anchor_lang::prelude::*;
use crate::state::{LoanRequest, CreditProfile, LoanStatus};
use crate::errors::SaathiError;
use crate::constants::*;

// ─────────────────────────────────────────────────────────────────────────────
// Record Repayment
//
// Called by your oracle backend when it detects a repayment via eSewa.
// The oracle sends SOL (which it received from the eSewa off-ramp) into the
// repayment vault, and this instruction distributes it pro-rata to lenders.
//
// For the MVP: oracle passes amount_lamports and we update the loan state.
// Full implementation requires iterating lender positions — use a separate
// "claim" instruction per lender to avoid running out of compute units.
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct RecordRepayment<'info> {
    /// Oracle backend wallet
    #[account(
        mut,
        constraint = oracle.key().to_string() == ORACLE_PUBKEY @ SaathiError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    /// CHECK: Used as seed only
    pub borrower: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_request.loan_id.to_le_bytes()],
        bump = loan_request.bump,
        constraint = loan_request.status == LoanStatus::Active @ SaathiError::LoanNotActive,
        constraint = loan_request.borrower == borrower.key(),
    )]
    pub loan_request: Account<'info, LoanRequest>,

    /// Borrower's credit profile — updated on repayment
    #[account(
        mut,
        seeds = [CREDIT_SEED, borrower.key().as_ref()],
        bump = credit_profile.bump,
    )]
    pub credit_profile: Account<'info, CreditProfile>,

    pub system_program: Program<'info, System>,
}

pub fn record_repayment(
    ctx: Context<RecordRepayment>,
    amount_lamports: u64,
) -> Result<()> {
    let loan = &mut ctx.accounts.loan_request;
    let profile = &mut ctx.accounts.credit_profile;
    let clock = Clock::get()?;

    // ── Sanity check ─────────────────────────────────────────────────────────
    let remaining_due = loan.total_due
        .checked_sub(loan.amount_repaid)
        .ok_or(SaathiError::MathOverflow)?;

    require!(amount_lamports <= remaining_due, SaathiError::OverpaymentDetected);

    // ── Update loan repayment tracking ────────────────────────────────────────
    loan.amount_repaid = loan.amount_repaid
        .checked_add(amount_lamports)
        .ok_or(SaathiError::MathOverflow)?;
    loan.last_repayment_at = clock.unix_timestamp;

    // ── Check if fully repaid ─────────────────────────────────────────────────
    if loan.amount_repaid >= loan.total_due {
        loan.status = LoanStatus::Repaid;

        // Reward on-time repayment with a credit score boost
        let expected_repayment_deadline = loan.disbursed_at
            + (loan.duration_days as i64 * 86400);
        let repaid_on_time = clock.unix_timestamp <= expected_repayment_deadline;

        if repaid_on_time {
            profile.loans_repaid_on_time += 1;
            // Boost credit score (cap at 1000)
            profile.credit_score = (profile.credit_score + 25).min(1000);
            msg!("Loan fully repaid on time! Credit score boosted to {}", profile.credit_score);
        } else {
            // Late but repaid — smaller boost
            profile.credit_score = (profile.credit_score + 5).min(1000);
            msg!("Loan repaid (late). Small credit score boost to {}", profile.credit_score);
        }
    }

    msg!(
        "Repayment recorded: {} lamports | total repaid: {}/{} | status: {:?}",
        amount_lamports,
        loan.amount_repaid,
        loan.total_due,
        loan.status,
    );

    // ── NOTE: Lender payouts ──────────────────────────────────────────────────
    // For the MVP, the oracle holds the repayment SOL and lenders call a
    // separate "claim_repayment" instruction with their LenderPosition PDA.
    // This avoids iterating unknown lender lists in a single transaction.
    // TODO: implement claim_repayment instruction next.

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark Default (called by oracle if borrower misses deadline)
// ─────────────────────────────────────────────────────────────────────────────
// TODO: implement this next — penalizes credit score and marks loan Defaulted.
// pub fn mark_default(...) -> Result<()> { ... }