import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Saathiloan } from "../target/types/saathiloan";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("SaathiLoan — full happy path", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Saathiloan as Program<Saathiloan>;

  // Wallets
  const oracle = (provider.wallet as anchor.Wallet & { payer: Keypair }).payer; // trusted oracle signer
  const borrower = Keypair.generate();
  const lender1 = Keypair.generate();
  const lender2 = Keypair.generate();

  // PDAs (we'll derive them below)
  let creditProfilePda: PublicKey;
  let loanRequestPda: PublicKey;
  let vaultPda: PublicKey;
  let lender1PositionPda: PublicKey;
  let lender2PositionPda: PublicKey;

  const LOAN_ID = new anchor.BN(1);
  const LOAN_AMOUNT = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

  before(async () => {
    // Airdrop SOL to all participants
    for (const kp of [oracle, borrower, lender1, lender2]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          kp.publicKey,
          5 * LAMPORTS_PER_SOL,
        ),
      );
    }

    // Derive PDAs
    [creditProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("credit"), borrower.publicKey.toBuffer()],
      program.programId,
    );

    [loanRequestPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("loan"),
        borrower.publicKey.toBuffer(),
        LOAN_ID.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), loanRequestPda.toBuffer()],
      program.programId,
    );

    [lender1PositionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        loanRequestPda.toBuffer(),
        lender1.publicKey.toBuffer(),
      ],
      program.programId,
    );

    [lender2PositionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        loanRequestPda.toBuffer(),
        lender2.publicKey.toBuffer(),
      ],
      program.programId,
    );
  });

  it("Oracle writes a credit profile for the borrower", async () => {
    await program.methods
      .upsertCreditProfile({
        creditScore: 650,
        totalEsewaVolumePaisa: new anchor.BN(500_000_00), // NPR 500,000 in paisa
        esewaTxCount: 87,
      })
      .accounts({
        oracle: oracle.publicKey,
        borrower: borrower.publicKey,
        creditProfile: creditProfilePda,
      })
      .signers([oracle])
      .rpc();

    const profile = await program.account.creditProfile.fetch(creditProfilePda);
    assert.equal(profile.creditScore, 650);
    assert.equal(profile.esewaTxCount, 87);
    console.log("Credit profile created with score:", profile.creditScore);
  });

  it("Borrower creates a loan request", async () => {
    await program.methods
      .createLoanRequest({
        amountRequested: LOAN_AMOUNT,
        interestBps: 1200, // 12% annual
        durationDays: 90,
        loanId: LOAN_ID,
      })
      .accounts({
        borrower: borrower.publicKey,
        creditProfile: creditProfilePda,
        loanRequest: loanRequestPda,
        vault: vaultPda,
      })
      .signers([borrower])
      .rpc();

    const loan = await program.account.loanRequest.fetch(loanRequestPda);
    assert.equal(loan.status.open !== undefined, true);
    assert.equal(loan.amountRequested.toString(), LOAN_AMOUNT.toString());
    assert.equal(loan.creditScoreSnapshot, 650);
    console.log(
      " Loan request created for",
      LOAN_AMOUNT.toString(),
      "lamports",
    );
  });

  it("Lender 1 funds 0.6 SOL (60% of loan)", async () => {
    const contribution = new anchor.BN(0.6 * LAMPORTS_PER_SOL);

    await program.methods
      .fundLoan(contribution)
      .accounts({
        lender: lender1.publicKey,
        borrower: borrower.publicKey,
        loanRequest: loanRequestPda,
        vault: vaultPda,
        lenderPosition: lender1PositionPda,
      })
      .signers([lender1])
      .rpc();

    const loan = await program.account.loanRequest.fetch(loanRequestPda);
    assert.equal(loan.status.open !== undefined, true); // still open
    assert.equal(loan.amountFunded.toString(), contribution.toString());
    console.log(" Lender 1 contributed 0.6 SOL. Loan status: Open");
  });

  it("Lender 2 funds 0.4 SOL — loan is now fully funded", async () => {
    const contribution = new anchor.BN(0.4 * LAMPORTS_PER_SOL);

    await program.methods
      .fundLoan(contribution)
      .accounts({
        lender: lender2.publicKey,
        borrower: borrower.publicKey,
        loanRequest: loanRequestPda,
        vault: vaultPda,
        lenderPosition: lender2PositionPda,
      })
      .signers([lender2])
      .rpc();

    const loan = await program.account.loanRequest.fetch(loanRequestPda);
    assert.equal(loan.status.funded !== undefined, true); // now funded!
    console.log(" Lender 2 contributed 0.4 SOL. Loan status: Funded");
  });

  it("Anyone can disburse the loan to the borrower", async () => {
    const borrowerBefore = await provider.connection.getBalance(
      borrower.publicKey,
    );

    await program.methods
      .disburseLoan()
      .accounts({
        caller: lender1.publicKey, // anyone can call
        borrower: borrower.publicKey,
        loanRequest: loanRequestPda,
        vault: vaultPda,
      })
      .signers([lender1])
      .rpc();

    const loan = await program.account.loanRequest.fetch(loanRequestPda);
    assert.equal(loan.status.active !== undefined, true);

    const borrowerAfter = await provider.connection.getBalance(
      borrower.publicKey,
    );
    assert.isAbove(borrowerAfter, borrowerBefore);
    console.log(" Loan disbursed. Borrower balance increased by ~1 SOL");
    console.log(
      "   Total due (principal + interest):",
      loan.totalDue.toString(),
    );
  });

  it("Oracle records a full repayment from eSewa", async () => {
    const loan = await program.account.loanRequest.fetch(loanRequestPda);

    await program.methods
      .recordRepayment(loan.totalDue) // full repayment
      .accounts({
        oracle: oracle.publicKey,
        borrower: borrower.publicKey,
        loanRequest: loanRequestPda,
        creditProfile: creditProfilePda,
      })
      .signers([oracle])
      .rpc();

    const updatedLoan = await program.account.loanRequest.fetch(loanRequestPda);
    const updatedProfile = await program.account.creditProfile.fetch(
      creditProfilePda,
    );

    assert.equal(updatedLoan.status.repaid !== undefined, true);
    assert.isAbove(updatedProfile.creditScore, 650); // score boosted
    assert.equal(updatedProfile.loansRepaidOnTime, 1);

    console.log(
      " Loan fully repaid! New credit score:",
      updatedProfile.creditScore,
    );
    console.log("   Loans repaid on time:", updatedProfile.loansRepaidOnTime);
  });
});
