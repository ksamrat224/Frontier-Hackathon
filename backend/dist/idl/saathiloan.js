"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    address: "5cJSjnL6XchWvGwRqqJM2FQnRRB2Xu62duawATgoit6d",
    metadata: {
        name: "saathiloan",
        version: "0.1.0",
        spec: "0.1.0",
        description: "Created with Anchor",
    },
    instructions: [
        {
            name: "cancel_loan_request",
            docs: ["Borrower cancels their loan request (only if not yet funded)."],
            discriminator: [191, 89, 190, 192, 169, 99, 215, 148],
            accounts: [
                {
                    name: "borrower",
                    writable: true,
                    signer: true,
                },
                {
                    name: "loan_request",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [108, 111, 97, 110],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                            {
                                kind: "account",
                                path: "loan_request.loan_id",
                                account: "LoanRequest",
                            },
                        ],
                    },
                },
            ],
            args: [],
        },
        {
            name: "create_loan_request",
            docs: [
                "Borrower posts a new loan request.",
                "Requires an existing credit profile with score >= MIN_CREDIT_SCORE.",
            ],
            discriminator: [98, 217, 110, 114, 5, 69, 35, 204],
            accounts: [
                {
                    name: "borrower",
                    writable: true,
                    signer: true,
                },
                {
                    name: "credit_profile",
                    docs: ["Must exist and be fresh with a passing score"],
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [99, 114, 101, 100, 105, 116],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                        ],
                    },
                },
                {
                    name: "loan_request",
                    docs: ["The new loan request account"],
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [108, 111, 97, 110],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                            {
                                kind: "arg",
                                path: "params.loan_id",
                            },
                        ],
                    },
                },
                {
                    name: "vault",
                    docs: [
                        "Native SOL escrow vault — a system account controlled by the program.",
                        'Lenders will send SOL here. Seeds include "vault" to separate from loan PDA.',
                    ],
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [118, 97, 117, 108, 116],
                            },
                            {
                                kind: "account",
                                path: "loan_request",
                            },
                        ],
                    },
                },
                {
                    name: "system_program",
                    address: "11111111111111111111111111111111",
                },
            ],
            args: [
                {
                    name: "params",
                    type: {
                        defined: {
                            name: "LoanRequestParams",
                        },
                    },
                },
            ],
        },
        {
            name: "disburse_loan",
            docs: [
                "Once the loan is fully funded, anyone can trigger disbursement.",
                "Releases SOL from escrow to the borrower.",
            ],
            discriminator: [115, 159, 152, 253, 201, 29, 29, 174],
            accounts: [
                {
                    name: "caller",
                    docs: [
                        "Anyone can trigger disbursal once funded (no signer restriction needed)",
                    ],
                    signer: true,
                },
                {
                    name: "borrower",
                    writable: true,
                },
                {
                    name: "loan_request",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [108, 111, 97, 110],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                            {
                                kind: "account",
                                path: "loan_request.loan_id",
                                account: "LoanRequest",
                            },
                        ],
                    },
                },
                {
                    name: "vault",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [118, 97, 117, 108, 116],
                            },
                            {
                                kind: "account",
                                path: "loan_request",
                            },
                        ],
                    },
                },
                {
                    name: "system_program",
                    address: "11111111111111111111111111111111",
                },
            ],
            args: [],
        },
        {
            name: "fund_loan",
            docs: [
                "Lender contributes SOL to a loan request escrow.",
                "Multiple lenders can fund the same loan (crowdlending).",
            ],
            discriminator: [50, 221, 51, 13, 3, 142, 116, 215],
            accounts: [
                {
                    name: "lender",
                    writable: true,
                    signer: true,
                },
                {
                    name: "borrower",
                },
                {
                    name: "loan_request",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [108, 111, 97, 110],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                            {
                                kind: "account",
                                path: "loan_request.loan_id",
                                account: "LoanRequest",
                            },
                        ],
                    },
                },
                {
                    name: "vault",
                    docs: ["The vault that holds lender SOL until disbursal"],
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [118, 97, 117, 108, 116],
                            },
                            {
                                kind: "account",
                                path: "loan_request",
                            },
                        ],
                    },
                },
                {
                    name: "lender_position",
                    docs: [
                        "Per-lender position tracking for this loan.",
                        "init_if_needed so the same lender can top up their contribution.",
                    ],
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [112, 111, 115, 105, 116, 105, 111, 110],
                            },
                            {
                                kind: "account",
                                path: "loan_request",
                            },
                            {
                                kind: "account",
                                path: "lender",
                            },
                        ],
                    },
                },
                {
                    name: "system_program",
                    address: "11111111111111111111111111111111",
                },
            ],
            args: [
                {
                    name: "amount_lamports",
                    type: "u64",
                },
            ],
        },
        {
            name: "record_repayment",
            docs: [
                "Called by YOUR backend oracle after detecting eSewa repayment.",
                "Records the repayment on-chain and distributes SOL to lenders.",
            ],
            discriminator: [193, 155, 76, 246, 27, 189, 147, 102],
            accounts: [
                {
                    name: "oracle",
                    docs: ["Oracle backend wallet"],
                    writable: true,
                    signer: true,
                },
                {
                    name: "borrower",
                },
                {
                    name: "loan_request",
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [108, 111, 97, 110],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                            {
                                kind: "account",
                                path: "loan_request.loan_id",
                                account: "LoanRequest",
                            },
                        ],
                    },
                },
                {
                    name: "credit_profile",
                    docs: ["Borrower's credit profile — updated on repayment"],
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [99, 114, 101, 100, 105, 116],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                        ],
                    },
                },
                {
                    name: "system_program",
                    address: "11111111111111111111111111111111",
                },
            ],
            args: [
                {
                    name: "amount_lamports",
                    type: "u64",
                },
            ],
        },
        {
            name: "upsert_credit_profile",
            docs: [
                "Called by YOUR trusted backend after verifying eSewa transaction history.",
                "Creates (or updates) the borrower's on-chain credit profile.",
            ],
            discriminator: [136, 113, 88, 107, 5, 90, 200, 225],
            accounts: [
                {
                    name: "oracle",
                    docs: [
                        "The oracle backend wallet (must match ORACLE_PUBKEY constant)",
                    ],
                    writable: true,
                    signer: true,
                },
                {
                    name: "borrower",
                    docs: ["The borrower whose credit profile is being written"],
                },
                {
                    name: "credit_profile",
                    docs: [
                        "The credit profile PDA for this borrower.",
                        "init_if_needed = create on first call, update on subsequent calls.",
                    ],
                    writable: true,
                    pda: {
                        seeds: [
                            {
                                kind: "const",
                                value: [99, 114, 101, 100, 105, 116],
                            },
                            {
                                kind: "account",
                                path: "borrower",
                            },
                        ],
                    },
                },
                {
                    name: "system_program",
                    address: "11111111111111111111111111111111",
                },
            ],
            args: [
                {
                    name: "params",
                    type: {
                        defined: {
                            name: "CreditProfileParams",
                        },
                    },
                },
            ],
        },
    ],
    accounts: [
        {
            name: "CreditProfile",
            discriminator: [155, 31, 253, 22, 211, 62, 131, 148],
        },
        {
            name: "LenderPosition",
            discriminator: [165, 98, 244, 204, 209, 158, 88, 19],
        },
        {
            name: "LoanRequest",
            discriminator: [244, 184, 133, 50, 20, 37, 31, 209],
        },
    ],
    errors: [
        {
            code: 6000,
            name: "UnauthorizedOracle",
            msg: "Only the trusted oracle can write credit profiles",
        },
        {
            code: 6001,
            name: "CreditScoreTooLow",
            msg: "Credit score too low to request a loan (minimum 300 required)",
        },
        {
            code: 6002,
            name: "StaleCredit",
            msg: "Credit profile has not been updated recently enough",
        },
        {
            code: 6003,
            name: "InvalidLoanAmount",
            msg: "Loan amount must be between 0.1 SOL and 100 SOL",
        },
        {
            code: 6004,
            name: "InvalidDuration",
            msg: "Loan duration must be between 7 and 365 days",
        },
        {
            code: 6005,
            name: "InvalidInterestRate",
            msg: "Interest rate must be between 100 bps (1%) and 5000 bps (50%)",
        },
        {
            code: 6006,
            name: "ActiveLoanExists",
            msg: "Borrower already has an active or funded loan",
        },
        {
            code: 6007,
            name: "LoanNotOpen",
            msg: "Loan is not in Open status",
        },
        {
            code: 6008,
            name: "LoanNotFunded",
            msg: "Loan is not in Funded status",
        },
        {
            code: 6009,
            name: "LoanNotActive",
            msg: "Loan is not in Active status",
        },
        {
            code: 6010,
            name: "UnauthorizedBorrower",
            msg: "Only the borrower can perform this action",
        },
        {
            code: 6011,
            name: "OverfundedLoan",
            msg: "Contribution amount exceeds remaining funding needed",
        },
        {
            code: 6012,
            name: "ContributionTooSmall",
            msg: "Minimum contribution is 0.01 SOL",
        },
        {
            code: 6013,
            name: "BorrowerCannotFund",
            msg: "Borrower cannot fund their own loan",
        },
        {
            code: 6014,
            name: "OverpaymentDetected",
            msg: "Repayment amount exceeds total amount due",
        },
        {
            code: 6015,
            name: "MathOverflow",
            msg: "Arithmetic overflow in repayment calculation",
        },
    ],
    types: [
        {
            name: "CreditProfile",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "borrower",
                        docs: ["The wallet that owns this credit profile"],
                        type: "pubkey",
                    },
                    {
                        name: "credit_score",
                        docs: [
                            "Score from 0–1000 computed from eSewa history",
                            "0–299 = poor, 300–599 = fair, 600–799 = good, 800+ = excellent",
                        ],
                        type: "u16",
                    },
                    {
                        name: "total_esewa_volume_paisa",
                        docs: [
                            "Total lifetime volume of eSewa transactions (in NPR paisa, to avoid floats)",
                        ],
                        type: "u64",
                    },
                    {
                        name: "esewa_tx_count",
                        docs: ["Number of eSewa transactions verified"],
                        type: "u32",
                    },
                    {
                        name: "loans_repaid_on_time",
                        docs: ["Number of loans repaid on time (on this platform)"],
                        type: "u16",
                    },
                    {
                        name: "loans_defaulted",
                        docs: ["Number of loans defaulted (late by > 30 days)"],
                        type: "u16",
                    },
                    {
                        name: "last_updated",
                        docs: ["UNIX timestamp of last oracle update"],
                        type: "i64",
                    },
                    {
                        name: "bump",
                        docs: ["Bump for PDA derivation"],
                        type: "u8",
                    },
                ],
            },
        },
        {
            name: "CreditProfileParams",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "credit_score",
                        type: "u16",
                    },
                    {
                        name: "total_esewa_volume_paisa",
                        type: "u64",
                    },
                    {
                        name: "esewa_tx_count",
                        type: "u32",
                    },
                ],
            },
        },
        {
            name: "LenderPosition",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "lender",
                        docs: ["The lender's wallet"],
                        type: "pubkey",
                    },
                    {
                        name: "loan",
                        docs: ["The loan this position is for"],
                        type: "pubkey",
                    },
                    {
                        name: "amount_contributed",
                        docs: ["How much this lender contributed (lamports)"],
                        type: "u64",
                    },
                    {
                        name: "amount_received",
                        docs: ["How much has been repaid to this lender so far (lamports)"],
                        type: "u64",
                    },
                    {
                        name: "funded_at",
                        docs: ["UNIX timestamp of contribution"],
                        type: "i64",
                    },
                    {
                        name: "bump",
                        docs: ["Bump"],
                        type: "u8",
                    },
                ],
            },
        },
        {
            name: "LoanRequest",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "borrower",
                        docs: ["Borrower's wallet"],
                        type: "pubkey",
                    },
                    {
                        name: "loan_id",
                        docs: [
                            "Monotonically increasing ID per borrower (from CreditProfile)",
                        ],
                        type: "u64",
                    },
                    {
                        name: "amount_requested",
                        docs: [
                            "Amount requested in lamports (1 SOL = 1_000_000_000 lamports)",
                        ],
                        type: "u64",
                    },
                    {
                        name: "amount_funded",
                        docs: [
                            "Total amount funded so far (sum of all lender contributions)",
                        ],
                        type: "u64",
                    },
                    {
                        name: "interest_bps",
                        docs: ["Interest rate in basis points (e.g. 1200 = 12.00% annual)"],
                        type: "u16",
                    },
                    {
                        name: "duration_days",
                        docs: ["Loan duration in days"],
                        type: "u16",
                    },
                    {
                        name: "credit_score_snapshot",
                        docs: ["Credit score at time of loan creation (snapshot)"],
                        type: "u16",
                    },
                    {
                        name: "status",
                        docs: ["Current state of this loan"],
                        type: {
                            defined: {
                                name: "LoanStatus",
                            },
                        },
                    },
                    {
                        name: "created_at",
                        docs: ["UNIX timestamp when loan was created"],
                        type: "i64",
                    },
                    {
                        name: "disbursed_at",
                        docs: ["UNIX timestamp when loan was fully funded and disbursed"],
                        type: "i64",
                    },
                    {
                        name: "last_repayment_at",
                        docs: ["UNIX timestamp of last repayment"],
                        type: "i64",
                    },
                    {
                        name: "amount_repaid",
                        docs: ["Total amount repaid so far (lamports)"],
                        type: "u64",
                    },
                    {
                        name: "total_due",
                        docs: [
                            "Total amount due (principal + interest, computed at disbursal)",
                        ],
                        type: "u64",
                    },
                    {
                        name: "bump",
                        docs: ["Bump for PDA derivation"],
                        type: "u8",
                    },
                ],
            },
        },
        {
            name: "LoanRequestParams",
            type: {
                kind: "struct",
                fields: [
                    {
                        name: "amount_requested",
                        type: "u64",
                    },
                    {
                        name: "interest_bps",
                        type: "u16",
                    },
                    {
                        name: "duration_days",
                        type: "u16",
                    },
                    {
                        name: "loan_id",
                        docs: [
                            "A simple u64 counter so a borrower can have multiple loans over time.",
                            "Your frontend should read the borrower's last loan_id and increment.",
                        ],
                        type: "u64",
                    },
                ],
            },
        },
        {
            name: "LoanStatus",
            type: {
                kind: "enum",
                variants: [
                    {
                        name: "Open",
                    },
                    {
                        name: "Funded",
                    },
                    {
                        name: "Active",
                    },
                    {
                        name: "Repaid",
                    },
                    {
                        name: "Defaulted",
                    },
                    {
                        name: "Cancelled",
                    },
                ],
            },
        },
    ],
};
