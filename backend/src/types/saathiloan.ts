/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/saathiloan.json`.
 */
export type Saathiloan = {
  "address": "5cJSjnL6XchWvGwRqqJM2FQnRRB2Xu62duawATgoit6d",
  "metadata": {
    "name": "saathiloan",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelLoanRequest",
      "docs": [
        "Borrower cancels their loan request (only if not yet funded)."
      ],
      "discriminator": [
        191,
        89,
        190,
        192,
        169,
        99,
        215,
        148
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true
        },
        {
          "name": "loanRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "loan_request.loan_id",
                "account": "loanRequest"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createLoanRequest",
      "docs": [
        "Borrower posts a new loan request.",
        "Requires an existing credit profile with score >= MIN_CREDIT_SCORE."
      ],
      "discriminator": [
        98,
        217,
        110,
        114,
        5,
        69,
        35,
        204
      ],
      "accounts": [
        {
          "name": "borrower",
          "writable": true,
          "signer": true
        },
        {
          "name": "creditProfile",
          "docs": [
            "Must exist and be fresh with a passing score"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "loanRequest",
          "docs": [
            "The new loan request account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "arg",
                "path": "params.loan_id"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Native SOL escrow vault — a system account controlled by the program.",
            "Lenders will send SOL here. Seeds include \"vault\" to separate from loan PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "loanRequest"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "loanRequestParams"
            }
          }
        }
      ]
    },
    {
      "name": "disburseLoan",
      "docs": [
        "Once the loan is fully funded, anyone can trigger disbursement.",
        "Releases SOL from escrow to the borrower."
      ],
      "discriminator": [
        115,
        159,
        152,
        253,
        201,
        29,
        29,
        174
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can trigger disbursal once funded (no signer restriction needed)"
          ],
          "signer": true
        },
        {
          "name": "borrower",
          "writable": true
        },
        {
          "name": "loanRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "loan_request.loan_id",
                "account": "loanRequest"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "loanRequest"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "fundLoan",
      "docs": [
        "Lender contributes SOL to a loan request escrow.",
        "Multiple lenders can fund the same loan (crowdlending)."
      ],
      "discriminator": [
        50,
        221,
        51,
        13,
        3,
        142,
        116,
        215
      ],
      "accounts": [
        {
          "name": "lender",
          "writable": true,
          "signer": true
        },
        {
          "name": "borrower"
        },
        {
          "name": "loanRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "loan_request.loan_id",
                "account": "loanRequest"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault that holds lender SOL until disbursal"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "loanRequest"
              }
            ]
          }
        },
        {
          "name": "lenderPosition",
          "docs": [
            "Per-lender position tracking for this loan.",
            "init_if_needed so the same lender can top up their contribution."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "loanRequest"
              },
              {
                "kind": "account",
                "path": "lender"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "recordRepayment",
      "docs": [
        "Called by YOUR backend oracle after detecting eSewa repayment.",
        "Records the repayment on-chain and distributes SOL to lenders."
      ],
      "discriminator": [
        193,
        155,
        76,
        246,
        27,
        189,
        147,
        102
      ],
      "accounts": [
        {
          "name": "oracle",
          "docs": [
            "Oracle backend wallet"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "borrower"
        },
        {
          "name": "loanRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              },
              {
                "kind": "account",
                "path": "loan_request.loan_id",
                "account": "loanRequest"
              }
            ]
          }
        },
        {
          "name": "creditProfile",
          "docs": [
            "Borrower's credit profile — updated on repayment"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "upsertCreditProfile",
      "docs": [
        "Called by YOUR trusted backend after verifying eSewa transaction history.",
        "Creates (or updates) the borrower's on-chain credit profile."
      ],
      "discriminator": [
        136,
        113,
        88,
        107,
        5,
        90,
        200,
        225
      ],
      "accounts": [
        {
          "name": "oracle",
          "docs": [
            "The oracle backend wallet (must match ORACLE_PUBKEY constant)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "borrower",
          "docs": [
            "The borrower whose credit profile is being written"
          ]
        },
        {
          "name": "creditProfile",
          "docs": [
            "The credit profile PDA for this borrower.",
            "init_if_needed = create on first call, update on subsequent calls."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "borrower"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "creditProfileParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "creditProfile",
      "discriminator": [
        155,
        31,
        253,
        22,
        211,
        62,
        131,
        148
      ]
    },
    {
      "name": "lenderPosition",
      "discriminator": [
        165,
        98,
        244,
        204,
        209,
        158,
        88,
        19
      ]
    },
    {
      "name": "loanRequest",
      "discriminator": [
        244,
        184,
        133,
        50,
        20,
        37,
        31,
        209
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorizedOracle",
      "msg": "Only the trusted oracle can write credit profiles"
    },
    {
      "code": 6001,
      "name": "creditScoreTooLow",
      "msg": "Credit score too low to request a loan (minimum 300 required)"
    },
    {
      "code": 6002,
      "name": "staleCredit",
      "msg": "Credit profile has not been updated recently enough"
    },
    {
      "code": 6003,
      "name": "invalidLoanAmount",
      "msg": "Loan amount must be between 0.1 SOL and 100 SOL"
    },
    {
      "code": 6004,
      "name": "invalidDuration",
      "msg": "Loan duration must be between 7 and 365 days"
    },
    {
      "code": 6005,
      "name": "invalidInterestRate",
      "msg": "Interest rate must be between 100 bps (1%) and 5000 bps (50%)"
    },
    {
      "code": 6006,
      "name": "activeLoanExists",
      "msg": "Borrower already has an active or funded loan"
    },
    {
      "code": 6007,
      "name": "loanNotOpen",
      "msg": "Loan is not in Open status"
    },
    {
      "code": 6008,
      "name": "loanNotFunded",
      "msg": "Loan is not in Funded status"
    },
    {
      "code": 6009,
      "name": "loanNotActive",
      "msg": "Loan is not in Active status"
    },
    {
      "code": 6010,
      "name": "unauthorizedBorrower",
      "msg": "Only the borrower can perform this action"
    },
    {
      "code": 6011,
      "name": "overfundedLoan",
      "msg": "Contribution amount exceeds remaining funding needed"
    },
    {
      "code": 6012,
      "name": "contributionTooSmall",
      "msg": "Minimum contribution is 0.01 SOL"
    },
    {
      "code": 6013,
      "name": "borrowerCannotFund",
      "msg": "Borrower cannot fund their own loan"
    },
    {
      "code": 6014,
      "name": "overpaymentDetected",
      "msg": "Repayment amount exceeds total amount due"
    },
    {
      "code": 6015,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow in repayment calculation"
    }
  ],
  "types": [
    {
      "name": "creditProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "docs": [
              "The wallet that owns this credit profile"
            ],
            "type": "pubkey"
          },
          {
            "name": "creditScore",
            "docs": [
              "Score from 0–1000 computed from eSewa history",
              "0–299 = poor, 300–599 = fair, 600–799 = good, 800+ = excellent"
            ],
            "type": "u16"
          },
          {
            "name": "totalEsewaVolumePaisa",
            "docs": [
              "Total lifetime volume of eSewa transactions (in NPR paisa, to avoid floats)"
            ],
            "type": "u64"
          },
          {
            "name": "esewaTxCount",
            "docs": [
              "Number of eSewa transactions verified"
            ],
            "type": "u32"
          },
          {
            "name": "loansRepaidOnTime",
            "docs": [
              "Number of loans repaid on time (on this platform)"
            ],
            "type": "u16"
          },
          {
            "name": "loansDefaulted",
            "docs": [
              "Number of loans defaulted (late by > 30 days)"
            ],
            "type": "u16"
          },
          {
            "name": "lastUpdated",
            "docs": [
              "UNIX timestamp of last oracle update"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for PDA derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "creditProfileParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creditScore",
            "type": "u16"
          },
          {
            "name": "totalEsewaVolumePaisa",
            "type": "u64"
          },
          {
            "name": "esewaTxCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "lenderPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lender",
            "docs": [
              "The lender's wallet"
            ],
            "type": "pubkey"
          },
          {
            "name": "loan",
            "docs": [
              "The loan this position is for"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountContributed",
            "docs": [
              "How much this lender contributed (lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "amountReceived",
            "docs": [
              "How much has been repaid to this lender so far (lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "fundedAt",
            "docs": [
              "UNIX timestamp of contribution"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loanRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrower",
            "docs": [
              "Borrower's wallet"
            ],
            "type": "pubkey"
          },
          {
            "name": "loanId",
            "docs": [
              "Monotonically increasing ID per borrower (from CreditProfile)"
            ],
            "type": "u64"
          },
          {
            "name": "amountRequested",
            "docs": [
              "Amount requested in lamports (1 SOL = 1_000_000_000 lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "amountFunded",
            "docs": [
              "Total amount funded so far (sum of all lender contributions)"
            ],
            "type": "u64"
          },
          {
            "name": "interestBps",
            "docs": [
              "Interest rate in basis points (e.g. 1200 = 12.00% annual)"
            ],
            "type": "u16"
          },
          {
            "name": "durationDays",
            "docs": [
              "Loan duration in days"
            ],
            "type": "u16"
          },
          {
            "name": "creditScoreSnapshot",
            "docs": [
              "Credit score at time of loan creation (snapshot)"
            ],
            "type": "u16"
          },
          {
            "name": "status",
            "docs": [
              "Current state of this loan"
            ],
            "type": {
              "defined": {
                "name": "loanStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "UNIX timestamp when loan was created"
            ],
            "type": "i64"
          },
          {
            "name": "disbursedAt",
            "docs": [
              "UNIX timestamp when loan was fully funded and disbursed"
            ],
            "type": "i64"
          },
          {
            "name": "lastRepaymentAt",
            "docs": [
              "UNIX timestamp of last repayment"
            ],
            "type": "i64"
          },
          {
            "name": "amountRepaid",
            "docs": [
              "Total amount repaid so far (lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "totalDue",
            "docs": [
              "Total amount due (principal + interest, computed at disbursal)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for PDA derivation"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loanRequestParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountRequested",
            "type": "u64"
          },
          {
            "name": "interestBps",
            "type": "u16"
          },
          {
            "name": "durationDays",
            "type": "u16"
          },
          {
            "name": "loanId",
            "docs": [
              "A simple u64 counter so a borrower can have multiple loans over time.",
              "Your frontend should read the borrower's last loan_id and increment."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "loanStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "funded"
          },
          {
            "name": "active"
          },
          {
            "name": "repaid"
          },
          {
            "name": "defaulted"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    }
  ]
};
