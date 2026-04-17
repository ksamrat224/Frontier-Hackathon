/// Your backend wallet that is allowed to write credit scores.
/// Replace this with your actual oracle keypair pubkey after generating it.
/// In production you'd use a multisig or a more robust oracle mechanism.
pub const ORACLE_PUBKEY: &str = "OracLe1111111111111111111111111111111111111";

/// Minimum credit score required to create a loan request
pub const MIN_CREDIT_SCORE: u16 = 300;

/// Minimum loan amount: 0.1 SOL in lamports
pub const MIN_LOAN_LAMPORTS: u64 = 100_000_000;

/// Maximum loan amount: 100 SOL in lamports
pub const MAX_LOAN_LAMPORTS: u64 = 100_000_000_000;

/// Minimum loan duration in days
pub const MIN_DURATION_DAYS: u16 = 7;

/// Maximum loan duration in days
pub const MAX_DURATION_DAYS: u16 = 365;

/// Minimum interest rate: 1% annual = 100 basis points
pub const MIN_INTEREST_BPS: u16 = 100;

/// Maximum interest rate: 50% annual = 5000 basis points
pub const MAX_INTEREST_BPS: u16 = 5000;

/// Minimum lender contribution: 0.01 SOL in lamports
pub const MIN_CONTRIBUTION_LAMPORTS: u64 = 10_000_000;

/// How many seconds a credit profile stays "fresh" before oracle must re-verify
/// 30 days = 30 * 24 * 60 * 60
pub const CREDIT_FRESHNESS_SECONDS: i64 = 2_592_000;

/// Platform fee in basis points taken from interest earned (5% of interest)
pub const PLATFORM_FEE_BPS: u16 = 500;

/// PDA seeds
pub const CREDIT_SEED: &[u8] = b"credit";
pub const LOAN_SEED: &[u8] = b"loan";
pub const VAULT_SEED: &[u8] = b"vault";
pub const POSITION_SEED: &[u8] = b"position";