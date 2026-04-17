use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;
pub mod constants;

use instructions::*;

use instructions::credit::__client_accounts_upsert_credit_profile;
use instructions::fund::{__client_accounts_disburse_loan, __client_accounts_fund_loan};
use instructions::loan::{__client_accounts_cancel_loan_request, __client_accounts_create_loan_request};
use instructions::repayment::__client_accounts_record_repayment;

declare_id!("5cJSjnL6XchWvGwRqqJM2FQnRRB2Xu62duawATgoit6d"); // replace after `anchor keys list`

#[program]
pub mod saathiloan {
    use super::*;

    // ─── Oracle ───────────────────────────────────────────────────────────────

    /// Called by YOUR trusted backend after verifying eSewa transaction history.
    /// Creates (or updates) the borrower's on-chain credit profile.
    pub fn upsert_credit_profile(
        ctx: Context<UpsertCreditProfile>,
        params: CreditProfileParams,
    ) -> Result<()> {
        instructions::credit::upsert_credit_profile(ctx, params)
    }

    // ─── Borrower ─────────────────────────────────────────────────────────────

    /// Borrower posts a new loan request.
    /// Requires an existing credit profile with score >= MIN_CREDIT_SCORE.
    pub fn create_loan_request(
        ctx: Context<CreateLoanRequest>,
        params: LoanRequestParams,
    ) -> Result<()> {
        instructions::loan::create_loan_request(ctx, params)
    }

    /// Borrower cancels their loan request (only if not yet funded).
    pub fn cancel_loan_request(ctx: Context<CancelLoanRequest>) -> Result<()> {
        instructions::loan::cancel_loan_request(ctx)
    }

    // ─── Lender ───────────────────────────────────────────────────────────────

    /// Lender contributes SOL to a loan request escrow.
    /// Multiple lenders can fund the same loan (crowdlending).
    pub fn fund_loan(ctx: Context<FundLoan>, amount_lamports: u64) -> Result<()> {
        instructions::fund::fund_loan(ctx, amount_lamports)
    }

    /// Once the loan is fully funded, anyone can trigger disbursement.
    /// Releases SOL from escrow to the borrower.
    pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
        instructions::fund::disburse_loan(ctx)
    }

    // ─── Repayment ────────────────────────────────────────────────────────────

    /// Called by YOUR backend oracle after detecting eSewa repayment.
    /// Records the repayment on-chain and distributes SOL to lenders.
    pub fn record_repayment(
        ctx: Context<RecordRepayment>,
        amount_lamports: u64,
    ) -> Result<()> {
        instructions::repayment::record_repayment(ctx, amount_lamports)
    }
}