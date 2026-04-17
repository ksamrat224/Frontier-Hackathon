use anchor_lang::prelude::*;
use crate::state::{CreditProfile, LoanRequest, LoanStatus};
use crate::errors::SaathiError;
use crate::constants::*;

// ─────────────────────────────────────────────────────────────────────────────
// Params passed by the borrower when creating a loan request
// ─────────────────────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct LoanRequestParams {
    pub amount_requested: u64,
    pub interest_bps: u16,
    pub duration_days: u16,
    /// A simple u64 counter so a borrower can have multiple loans over time.
    /// Your frontend should read the borrower's last loan_id and increment.
    pub loan_id: u64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Loan Request
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
#[instruction(params: LoanRequestParams)]
pub struct CreateLoanRequest<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    /// Must exist and be fresh with a passing score
    #[account(
        seeds = [CREDIT_SEED, borrower.key().as_ref()],
        bump = credit_profile.bump,
        constraint = credit_profile.borrower == borrower.key(),
    )]
    pub credit_profile: Account<'info, CreditProfile>,

    /// The new loan request account
    #[account(
        init,
        payer = borrower,
        space = LoanRequest::LEN,
        seeds = [
            LOAN_SEED,
            borrower.key().as_ref(),
            &params.loan_id.to_le_bytes()
        ],
        bump,
    )]
    pub loan_request: Account<'info, LoanRequest>,

    /// Native SOL escrow vault — a system account controlled by the program.
    /// Lenders will send SOL here. Seeds include "vault" to separate from loan PDA.
    #[account(
        init,
        payer = borrower,
        space = 0,
        seeds = [
            VAULT_SEED,
            loan_request.key().as_ref()
        ],
        bump,
    )]
    /// CHECK: This is a pure SOL vault controlled by seeds, no data needed
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_loan_request(
    ctx: Context<CreateLoanRequest>,
    params: LoanRequestParams,
) -> Result<()> {
    let profile = &ctx.accounts.credit_profile;
    let clock = Clock::get()?;

    // ── Validations ──────────────────────────────────────────────────────────

    // Credit score check
    require!(
        profile.credit_score >= MIN_CREDIT_SCORE,
        SaathiError::CreditScoreTooLow
    );

    // Credit freshness check (must be updated within 30 days)
    require!(
        clock.unix_timestamp - profile.last_updated <= CREDIT_FRESHNESS_SECONDS,
        SaathiError::StaleCredit
    );

    // Loan amount bounds
    require!(
        params.amount_requested >= MIN_LOAN_LAMPORTS
            && params.amount_requested <= MAX_LOAN_LAMPORTS,
        SaathiError::InvalidLoanAmount
    );

    // Duration bounds
    require!(
        params.duration_days >= MIN_DURATION_DAYS
            && params.duration_days <= MAX_DURATION_DAYS,
        SaathiError::InvalidDuration
    );

    // Interest rate bounds
    require!(
        params.interest_bps >= MIN_INTEREST_BPS
            && params.interest_bps <= MAX_INTEREST_BPS,
        SaathiError::InvalidInterestRate
    );

    // ── Write State ──────────────────────────────────────────────────────────

    let loan = &mut ctx.accounts.loan_request;
    loan.borrower = ctx.accounts.borrower.key();
    loan.loan_id = params.loan_id;
    loan.amount_requested = params.amount_requested;
    loan.amount_funded = 0;
    loan.interest_bps = params.interest_bps;
    loan.duration_days = params.duration_days;
    loan.credit_score_snapshot = profile.credit_score;
    loan.status = LoanStatus::Open;
    loan.created_at = clock.unix_timestamp;
    loan.disbursed_at = 0;
    loan.last_repayment_at = 0;
    loan.amount_repaid = 0;
    loan.total_due = 0; // computed at disbursal
    loan.bump = ctx.bumps.loan_request;

    msg!(
        "Loan request created: {} lamports at {} bps for {} days | score snapshot: {}",
        loan.amount_requested,
        loan.interest_bps,
        loan.duration_days,
        loan.credit_score_snapshot
    );

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel Loan Request
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct CancelLoanRequest<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_request.loan_id.to_le_bytes()],
        bump = loan_request.bump,
        constraint = loan_request.borrower == borrower.key() @ SaathiError::UnauthorizedBorrower,
        constraint = loan_request.status == LoanStatus::Open @ SaathiError::LoanNotOpen,
    )]
    pub loan_request: Account<'info, LoanRequest>,
}

pub fn cancel_loan_request(ctx: Context<CancelLoanRequest>) -> Result<()> {
    let loan = &mut ctx.accounts.loan_request;
    loan.status = LoanStatus::Cancelled;
    msg!("Loan request cancelled by borrower");
    Ok(())
}