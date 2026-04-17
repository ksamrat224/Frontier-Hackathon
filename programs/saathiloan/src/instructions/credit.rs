use anchor_lang::prelude::*;
use crate::state::CreditProfile;
use crate::errors::SaathiError;
use crate::constants::*;

// ─────────────────────────────────────────────────────────────────────────────
// Params passed by the oracle when writing a credit profile
// ─────────────────────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreditProfileParams {
    pub credit_score: u16,
    pub total_esewa_volume_paisa: u64,
    pub esewa_tx_count: u32,
}

// ─────────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct UpsertCreditProfile<'info> {
    /// The oracle backend wallet (must match ORACLE_PUBKEY constant)
    #[account(
        mut,
        constraint = oracle.key().to_string() == ORACLE_PUBKEY @ SaathiError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    /// The borrower whose credit profile is being written
    /// CHECK: we only use this as a PDA seed and to store in the account
    pub borrower: UncheckedAccount<'info>,

    /// The credit profile PDA for this borrower.
    /// init_if_needed = create on first call, update on subsequent calls.
    #[account(
        init_if_needed,
        payer = oracle,
        space = CreditProfile::LEN,
        seeds = [CREDIT_SEED, borrower.key().as_ref()],
        bump,
    )]
    pub credit_profile: Account<'info, CreditProfile>,

    pub system_program: Program<'info, System>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────
pub fn upsert_credit_profile(
    ctx: Context<UpsertCreditProfile>,
    params: CreditProfileParams,
) -> Result<()> {
    let profile = &mut ctx.accounts.credit_profile;
    let clock = Clock::get()?;

    // Preserve existing repayment history when updating
    // (only the oracle writes new eSewa data, not repayment history)
    profile.borrower = ctx.accounts.borrower.key();
    profile.credit_score = params.credit_score;
    profile.total_esewa_volume_paisa = params.total_esewa_volume_paisa;
    profile.esewa_tx_count = params.esewa_tx_count;
    profile.last_updated = clock.unix_timestamp;
    profile.bump = ctx.bumps.credit_profile;

    msg!(
        "Credit profile updated for {:?} | score: {}",
        profile.borrower,
        profile.credit_score
    );

    Ok(())
}