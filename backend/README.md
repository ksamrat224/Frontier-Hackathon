# SaathiLoan Backend (Oracle)

The Node.js oracle server that bridges eSewa ↔ Solana.

---

## What this does

1. **Accepts eSewa PDF uploads** → parses transactions → computes credit score → writes to Solana
2. **Triggers loan disbursal** when a loan is fully funded
3. **Records repayments** when eSewa payments are detected → updates borrower credit score

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Generate oracle keypair
```bash
# From your Anchor project root:
solana-keygen new -o oracle-keypair.json

# Get the public key — paste into Anchor program's constants.rs
solana-keygen pubkey oracle-keypair.json

# Fund it on devnet
solana airdrop 2 $(solana-keygen pubkey oracle-keypair.json) --url devnet
```

### 3. Set up environment
```bash
cp .env.example .env
# Edit .env:
#   ORACLE_KEYPAIR = paste contents of oracle-keypair.json
#   PROGRAM_ID     = your deployed Anchor program ID
```

### 4. Copy the IDL
```bash
# After running `anchor build` in your Anchor project:
cp ../target/idl/saathiloan.json ./idl/saathiloan.json
```

### 5. Run
```bash
npm run dev   # development with hot reload
npm run build && npm start  # production
```

---

## API Endpoints

### Credit

**POST** `/api/credit/upload`
Upload an eSewa PDF statement and write credit score on-chain.

```bash
curl -X POST http://localhost:3001/api/credit/upload \
  -F "file=@/path/to/esewa-statement.pdf" \
  -F "borrowerAddress=<SOLANA_WALLET_ADDRESS>"
```

Response:
```json
{
  "success": true,
  "creditScore": 650,
  "breakdown": {
    "volumeScore": 220,
    "frequencyScore": 150,
    "consistencyScore": 110,
    "historyLengthScore": 170
  },
  "stats": {
    "totalVolumeNPR": 250000,
    "txCount": 63,
    "monthlyAvgNPR": 20833
  },
  "onChainTx": "5xyz...",
  "message": "You are eligible to request a loan!"
}
```

**GET** `/api/credit/:borrowerAddress`
Fetch existing credit profile from chain.

---

### Loan

**POST** `/api/loan/disburse`
Trigger disbursal of a fully funded loan.

```json
{ "borrowerAddress": "abc...", "loanId": 1 }
```

---

### Repayment

**POST** `/api/repayment/record`
Manually record an eSewa repayment on-chain.

```json
{
  "borrowerAddress": "abc...",
  "loanId": 1,
  "amountNPR": 5000,
  "esewaRef": "ESW-2024-001234"
}
```

**POST** `/api/repayment/webhook`
Placeholder for future eSewa webhook integration.

---

## Credit Score Formula

| Component | Max Points | Criteria |
|---|---|---|
| Volume | 300 | Total NPR moved through eSewa |
| Frequency | 300 | Number of transactions |
| Consistency | 200 | Monthly average volume |
| History Length | 200 | How long they've used eSewa |
| **Total** | **1000** | Minimum 300 needed to apply |

---

## File Structure

```
src/
  index.ts                  ← Express server entry
  routes/
    credit.ts               ← PDF upload + credit score endpoints
    loan.ts                 ← Loan disbursal endpoint
    repayment.ts            ← Repayment recording endpoint
  services/
    esewaParser.ts          ← PDF parsing + credit score computation
    solanaOracle.ts         ← Anchor program instruction callers
  utils/
    solana.ts               ← Connection, keypair, PDA helpers
idl/
  saathiloan.json           ← Copy from `anchor build` output
```