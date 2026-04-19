# P2P Lending Platform on Solana

A decentralized peer-to-peer lending platform built on Solana blockchain with  fraud detection and credit scoring.

## 🌟 Project Overview

This is a full-stack P2P lending application that enables:
- **Borrowers** to request loans with transparent terms
- **Lenders** to fund loans and earn interest
- **AI-powered fraud detection** using advanced pattern recognition
- **Credit scoring algorithm** analyzing repayment history and risk factors
- **Real-time messaging** between borrowers and lenders
- **KYC verification** for user authentication
- **Admin dashboard** for application management
- **Blockchain integration** with Solana for secure transactions


## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** + **shadcn/ui** for modern UI components
- **React Router** for navigation
- **TanStack Query** for data fetching
- **Solana Wallet Adapter** for Web3 integration


### Blockchain
- **Solana** smart contracts using Anchor framework
- **SPL Token** integration for lending operations
- Deployed on Solana Devnet (configurable for mainnet)

## 📋 Prerequisites

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn**
- **Git**
- **Rust** and **Solana CLI** (for smart contract development) - [Install Solana](https://docs.solana.com/cli/install-solana-cli-tools)
- **Anchor** (v0.29.0) - [Install Anchor](https://www.anchor-lang.com/docs/installation)


### Database Schema

The database includes the following main tables:

- **profiles** - User profiles with role, wallet balance, and credit score
- **loan_requests** - Loan applications with risk assessment
- **loan_repayments** - Repayment tracking
- **kyc_applications** - KYC verification documents
- **messages** & **conversations** - Real-time messaging system
- **notifications** - User notification system
- **fraud_detection_logs** - AI fraud analysis logs
- **user_badges** - Gamification and achievement tracking

### Edge Functions

Located in `supabase/functions/`:

1. **fraud-detection** - A

2. 


```

## ⛓️ Solana Smart Contract Setup

### Navigate to Contract Directory

```sh
cd solana-contract
```

### Install Rust Dependencies

```sh
npm install
```

### Build the Smart Contract

```sh
anchor build
```

### Deploy to Devnet

```sh
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment (if needed)
solana airdrop 2

# Deploy the program
anchor deploy
```

### Get Program ID

```sh
solana address -k target/deploy/p2p_lending-keypair.json
```

### Update Configuration

Copy the program ID and update `src/config/solana.ts`:

```typescript
export const LENDING_PROGRAM_ID = new PublicKey(
  'YOUR_PROGRAM_ID_HERE'
);
```

### Detailed Deployment Guide

See `solana-contract/DEPLOYMENT_GUIDE.md` for comprehensive deployment instructions.

## 👨‍💼 Admin Panel Access

### Accessing the Admin Dashboard

1. Navigate to `/admin` route
2. **Admin credentials required** - Only users with `role = 'admin'` in the profiles table can access

### Creating an Admin User

#### Method 1: Via Lovable Cloud UI
1. Open Lovable Cloud backend
2. Navigate to Database → Tables → profiles
3. Find your user and set `role` to `'admin'`

#### Method 2: Via SQL
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = 'your-user-id';
```

### Admin Features

- **KYC Applications** - Review and approve/reject user verification
- **Loan Requests** - Approve or reject loan applications
- **Fraud Detection Logs** - View AI fraud analysis results
- **User Management** - Monitor user activity and credit scores

## 🔐 Authentication Setup

### Enable Auto-Confirm for Development

For testing, email confirmation is auto-enabled. For production:

1. Open Lovable Cloud backend
2. Navigate to Authentication settings
3. Configure email templates and providers

### Supported Auth Methods

- Email/Password authentication
- Google OAuth (configurable)
- Phone authentication (configurable)

## 📱 System Features & How They Work

### 1. Loan Request Flow

1. **Borrower** completes profile setup and KYC verification
2. **Borrower** creates loan request at `/create-loan`
3. **AI Fraud Detection** analyzes the application
4. **Credit Scoring** calculates risk level
5. **Admin** reviews and approves (if needed)
6. **Lender** browses marketplace and funds loan
7. **Blockchain** transaction executes via Solana smart contract
8. **Repayment** tracking begins

### 2. Credit Scoring Algorithm

Located in `src/utils/riskScoring.ts`:

- **Repayment History** (40% weight)
- **Loan-to-Income Ratio** (30% weight)
- **Credit Utilization** (15% weight)
- **Account Age** (10% weight)
- **Loan Purpose** (5% weight)

Returns risk level: `low`, `medium`, or `high`

### 3. AI Fraud Detection

Edge function at `supabase/functions/fraud-detection/index.ts`:

**Detection Patterns:**
- Unusually high loan amounts
- Multiple rapid applications
- Inconsistent income data
- Suspicious repayment history
- Geographic anomalies

**AI Analysis:**
- Uses Lovable AI (Google Gemini 2.5 Flash)
- Analyzes user history and patterns
- Returns structured fraud assessment
- Logs all detections with confidence scores

### 4. Messaging System

Real-time messaging between borrowers and lenders:
- PostgreSQL `realtime` subscriptions
- End-to-end conversation tracking
- Participant management with RLS policies

### 5. Gamification

- **Badges** - Earned for milestones (First Loan, Top Lender, etc.)
- **Leaderboards** - Top borrowers and lenders ranking
- Located at `/dashboard` → Badges & Leaderboards tabs

## 🎨 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | TanStack Query |
| Routing | React Router v6 |
| Backend | Supabase (via Lovable Cloud) |
| Database | PostgreSQL with RLS |
| Authentication | Supabase Auth |
| Realtime | PostgreSQL Realtime |
| AI Engine | Lovable AI (Gemini 2.5 Flash) |
| Blockchain | Solana + Anchor Framework |
| Smart Contract Language | Rust |

## 📂 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── badges/         # Badge system
│   │   ├── cards/          # Loan cards
│   │   ├── chatbot/        # AI chatbot
│   │   ├── leaderboards/   # Rankings
│   │   ├── marketplace/    # Loan filters
│   │   ├── messages/       # Messaging UI
│   │   ├── navigation/     # Navbar
│   │   ├── notifications/  # Notification system
│   │   └── ui/            # shadcn components
│   ├── pages/              # Route pages
│   │   ├── Index.tsx      # Landing page
│   │   ├── Auth.tsx       # Login/Signup
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── CreateLoan.tsx # Loan creation
│   │   ├── Admin.tsx      # Admin panel
│   │   ├── Analytics.tsx  # User analytics
│   │   ├── Wallet.tsx     # Wallet management
│   │   ├── KYC.tsx        # KYC verification
│   │   └── Messages.tsx   # Messaging
│   ├── utils/              # Utility functions
│   │   ├── riskScoring.ts        # Credit scoring
│   │   ├── graphRiskScoring.ts   # Graph-based risk
│   │   └── solanaLending.ts      # Blockchain utils
│   ├── config/             # Configuration
│   │   └── solana.ts      # Solana setup
│   └── integrations/       # Third-party integrations
│       └── supabase/      # Supabase client
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── fraud-detection/
│   │   └── ai-chatbot/
│   └── migrations/         # Database migrations
├── solana-contract/        # Anchor smart contract
│   ├── programs/
│   │   └── p2p-lending/
│   │       └── src/
│   │           └── lib.rs  # Solana program
│   └── DEPLOYMENT_GUIDE.md
└── public/                 # Static assets
```

## 🧪 Testing

### Frontend Testing
```sh
npm run build
```

### Smart Contract Testing
```sh
cd solana-contract
anchor test
```

## 📦 Deployment

### Frontend Deployment

**Via Lovable:**
1. Click **Publish** button (top right on desktop, bottom-right on mobile)
2. Click **Update** to deploy frontend changes

**Note**: Backend changes (edge functions, migrations) deploy automatically.

### Smart Contract Deployment

See `solana-contract/DEPLOYMENT_GUIDE.md` for production deployment to Solana mainnet.

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **JWT Authentication** for API requests
- **AI Fraud Detection** on loan applications
- **KYC Verification** for user identity
- **Encrypted secrets** management
- **Security Definer functions** to prevent circular RLS dependencies

## 📖 Additional Resources

- [Lovable Documentation](https://docs.lovable.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is built with Lovable and follows standard web application licensing.

## 🆘 Support

- **Lovable Discord**: [Join Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Documentation**: [Lovable Docs](https://docs.lovable.dev/)
- **Project URL**: https://lovable.dev/projects/507521ce-785d-4aed-9dce-a4fed220e267

---
