use anchor_lang::prelude::*;

#[error_code]
pub enum SaathiError {
    // ── Credit ────────────────────────────────────────────────────────────────
    #[msg("Only the trusted oracle can write credit profiles")]
    UnauthorizedOracle,

    #[msg("Credit score too low to request a loan (minimum 300 required)")]
    CreditScoreTooLow,

    #[msg("Credit profile has not been updated recently enough")]
    StaleCredit,

    // ── Loan Request ──────────────────────────────────────────────────────────
    #[msg("Loan amount must be between 0.1 SOL and 100 SOL")]
    InvalidLoanAmount,

    #[msg("Loan duration must be between 7 and 365 days")]
    InvalidDuration,

    #[msg("Interest rate must be between 100 bps (1%) and 5000 bps (50%)")]
    InvalidInterestRate,

    #[msg("Borrower already has an active or funded loan")]
    ActiveLoanExists,

    #[msg("Loan is not in Open status")]
    LoanNotOpen,

    #[msg("Loan is not in Funded status")]
    LoanNotFunded,

    #[msg("Loan is not in Active status")]
    LoanNotActive,

    #[msg("Only the borrower can perform this action")]
    UnauthorizedBorrower,

    // ── Funding ───────────────────────────────────────────────────────────────
    #[msg("Contribution amount exceeds remaining funding needed")]
    OverfundedLoan,

    #[msg("Minimum contribution is 0.01 SOL")]
    ContributionTooSmall,

    #[msg("Borrower cannot fund their own loan")]
    BorrowerCannotFund,

    // ── Repayment ─────────────────────────────────────────────────────────────
    #[msg("Repayment amount exceeds total amount due")]
    OverpaymentDetected,

    #[msg("Arithmetic overflow in repayment calculation")]
    MathOverflow,
}