use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{LoanRequest, LenderPosition, LoanStatus};
use crate::errors::SaathiError;
use crate::constants::*;

// ─────────────────────────────────────────────────────────────────────────────
// Fund Loan — lender sends SOL to the vault escrow
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct FundLoan<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    /// CHECK: only used to derive the loan PDA seed
    pub borrower: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_request.loan_id.to_le_bytes()],
        bump = loan_request.bump,
        constraint = loan_request.status == LoanStatus::Open @ SaathiError::LoanNotOpen,
        constraint = loan_request.borrower != lender.key() @ SaathiError::BorrowerCannotFund,
    )]
    pub loan_request: Account<'info, LoanRequest>,

    /// The vault that holds lender SOL until disbursal
    #[account(
        mut,
        seeds = [VAULT_SEED, loan_request.key().as_ref()],
        bump,
    )]
    /// CHECK: Pure SOL vault, no data
    pub vault: UncheckedAccount<'info>,

    /// Per-lender position tracking for this loan.
    /// init_if_needed so the same lender can top up their contribution.
    #[account(
        init_if_needed,
        payer = lender,
        space = LenderPosition::LEN,
        seeds = [POSITION_SEED, loan_request.key().as_ref(), lender.key().as_ref()],
        bump,
    )]
    pub lender_position: Account<'info, LenderPosition>,

    pub system_program: Program<'info, System>,
}

pub fn fund_loan(ctx: Context<FundLoan>, amount_lamports: u64) -> Result<()> {
    let loan = &mut ctx.accounts.loan_request;

    // ── Validations ──────────────────────────────────────────────────────────
    require!(
        amount_lamports >= MIN_CONTRIBUTION_LAMPORTS,
        SaathiError::ContributionTooSmall
    );

    let remaining = loan.amount_requested
        .checked_sub(loan.amount_funded)
        .ok_or(SaathiError::MathOverflow)?;

    // Cap contribution at what's still needed (don't overfund)
    require!(amount_lamports <= remaining, SaathiError::OverfundedLoan);

    // ── Transfer SOL: lender → vault ─────────────────────────────────────────
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.lender.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount_lamports,
    )?;

    // ── Update State ─────────────────────────────────────────────────────────
    loan.amount_funded = loan.amount_funded
        .checked_add(amount_lamports)
        .ok_or(SaathiError::MathOverflow)?;

    // Transition to Funded when fully filled
    if loan.amount_funded >= loan.amount_requested {
        loan.status = LoanStatus::Funded;
        msg!("Loan fully funded! Ready for disbursal.");
    }

    let position = &mut ctx.accounts.lender_position;
    position.lender = ctx.accounts.lender.key();
    position.loan = ctx.accounts.loan_request.key();
    position.amount_contributed = position.amount_contributed
        .checked_add(amount_lamports)
        .ok_or(SaathiError::MathOverflow)?;
    position.funded_at = Clock::get()?.unix_timestamp;

    msg!(
        "Lender {} contributed {} lamports ({}/{} total funded)",
        ctx.accounts.lender.key(),
        amount_lamports,
        loan.amount_funded,
        loan.amount_requested,
    );

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Disburse Loan — release escrow SOL to the borrower
// Can be called by anyone once loan is Funded (permissionless)
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct DisburseLoan<'info> {
    /// Anyone can trigger disbursal once funded (no signer restriction needed)
    pub caller: Signer<'info>,

    /// CHECK: SOL destination — verified via loan_request.borrower
    #[account(
        mut,
        constraint = borrower.key() == loan_request.borrower
    )]
    pub borrower: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [LOAN_SEED, borrower.key().as_ref(), &loan_request.loan_id.to_le_bytes()],
        bump = loan_request.bump,
        constraint = loan_request.status == LoanStatus::Funded @ SaathiError::LoanNotFunded,
    )]
    pub loan_request: Account<'info, LoanRequest>,

    #[account(
        mut,
        seeds = [VAULT_SEED, loan_request.key().as_ref()],
        bump,
    )]
    /// CHECK: Pure SOL vault
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
    let loan = &mut ctx.accounts.loan_request;
    let clock = Clock::get()?;

    // ── Compute total due (simple interest: P × rate × time) ─────────────────
    // interest = principal * interest_bps / 10000 * duration_days / 365
    let principal = loan.amount_requested;
    let interest = principal
        .checked_mul(loan.interest_bps as u64).ok_or(SaathiError::MathOverflow)?
        .checked_mul(loan.duration_days as u64).ok_or(SaathiError::MathOverflow)?
        .checked_div(10000).ok_or(SaathiError::MathOverflow)?
        .checked_div(365).ok_or(SaathiError::MathOverflow)?;

    loan.total_due = principal.checked_add(interest).ok_or(SaathiError::MathOverflow)?;
    loan.status = LoanStatus::Active;
    loan.disbursed_at = clock.unix_timestamp;

    // ── Transfer SOL: vault → borrower (PDA signer) ───────────────────────────
    let loan_key = ctx.accounts.loan_request.key();
    let vault_bump = ctx.bumps.vault;
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, loan_key.as_ref(), &[vault_bump]];

    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= principal;
    **ctx.accounts.borrower.to_account_info().try_borrow_mut_lamports()? += principal;

    msg!(
        "Disbursed {} lamports to borrower. Total due: {} lamports (principal + {} interest)",
        principal,
        loan.total_due,
        interest,
    );

    Ok(())
}