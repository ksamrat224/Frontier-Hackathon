# Frontier-Hackathon
# SaathiLoan 🇳🇵
### Peer-to-peer lending for Nepal, backed by eSewa credit history on Solana

Built for the Colosseum Frontier Hackathon 2026.

---

## What this is

SaathiLoan lets Nepali citizens lend to each other trustlessly on Solana.
Instead of bank paperwork and collateral, borrowers prove their creditworthiness
via their eSewa transaction history — which your oracle backend writes
immutably on-chain as a credit score.

---

## Architecture

```
eSewa API / PDF upload
        │
        ▼
  Oracle Backend ( Node.js server)
        │  signs with oracle keypair
        ▼
┌─────────────────────────────────────┐
│         Anchor Program              │
│                                     │
│  CreditProfile PDA                  │  ← oracle writes score here
│  LoanRequest PDA + Vault            │  ← borrower creates, lenders fund
│  LenderPosition PDA (per lender)   │  ← tracks each lender's contribution
│  Repayment tracking                 │  ← oracle records eSewa repayments
└─────────────────────────────────────┘
        │
        ▼
  Next.js Frontend
  (browse loans, fund, view credit score)
```

---

## Quick Start

### 1. Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest

# Install Node deps
yarn install
```

### 2. Generate your oracle keypair
```bash
# This keypair is your backend "oracle" that writes credit scores
solana-keygen new -o oracle-keypair.json
# Copy the pubkey into constants.rs → ORACLE_PUBKEY
solana-keygen pubkey oracle-keypair.json
```

### 3. Build and deploy to devnet
```bash
# Build the program
anchor build

# Get your program ID
anchor keys list
# → paste this into declare_id!() in lib.rs AND Anchor.toml

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests (on localnet)
anchor test
```

---

## Program Accounts

### CreditProfile
**Seeds:** `["credit", borrower_pubkey]`

Stores the borrower's eSewa-verified credit score. Written by your oracle.
On-chain and public — any lender can read it before funding a loan.

| Field | Type | Description |
|---|---|---|
| `credit_score` | u16 | 0–1000 score from eSewa history |
| `total_esewa_volume_paisa` | u64 | Lifetime eSewa volume in paisa |
| `esewa_tx_count` | u32 | Number of verified transactions |
| `loans_repaid_on_time` | u16 | Platform repayment history |
| `loans_defaulted` | u16 | Platform default history |

### LoanRequest
**Seeds:** `["loan", borrower_pubkey, loan_id_le_bytes]`

The loan listing. Lenders browse these. Status flows:
`Open → Funded → Active → Repaid` (or `Defaulted` / `Cancelled`)

### LenderPosition
**Seeds:** `["position", loan_pubkey, lender_pubkey]`

Tracks how much each lender contributed. Used for pro-rata repayment.

### Vault
**Seeds:** `["vault", loan_pubkey]`

Native SOL escrow account. Holds lender funds until disbursal.

---

## What to build next (in order of priority)

### For the hackathon MVP:
1. **`claim_repayment` instruction** — lenders call this to pull their
   pro-rata share of repayments from the oracle's repayment pool.

2. **`mark_default` instruction** — oracle calls this 30 days after deadline
   if no repayment detected. Penalizes credit score (-50 pts).

3. **Oracle backend (Node.js)**
   - Accept eSewa PDF statement upload
   - Parse transactions, compute score, sign and call `upsert_credit_profile`
   - Watch for eSewa webhooks (or polling) for repayments
   - Call `record_repayment` when detected

4. **Next.js frontend**
   - Connect Phantom wallet
   - "Apply for loan" flow (upload eSewa statement → see your score → post request)
   - "Browse loans" page for lenders (filter by credit score, rate, amount)
   - "My loans" dashboard

### Post-hackathon:
- USDC instead of SOL (use SPL token escrow)
- NPR stablecoin integration when available
- eSewa OAuth API instead of PDF upload
- Multisig oracle for decentralization
- Insurance pool funded by platform fees

---

## Credit Score Formula (suggestion)

```
score = 0

// Transaction history (40 pts max)
if tx_count >= 100: score += 40
elif tx_count >= 50: score += 25
elif tx_count >= 20: score += 15

// Volume (30 pts max)
if volume >= NPR 500,000: score += 30
elif volume >= NPR 100,000: score += 20
elif volume >= NPR 50,000: score += 10

// Platform repayment history (30 pts max, scales with 1000 total)
score += min(loans_repaid_on_time * 25, 300)
score -= loans_defaulted * 100

score = clamp(score * 10, 0, 1000)  // scale to 0-1000
```

---

## Team

Built for Colosseum Frontier Hackathon 2026 | April 6 – May 11, 2026