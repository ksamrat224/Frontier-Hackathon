import express from "express";
import { assessFraudRisk } from "../services/fraudRules";
import { fetchLoanRequest, recordRepayment } from "../services/solanaOracle";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/repayment/record
//
// Called by your repayment watcher when it detects an eSewa repayment.
//
// For the MVP: you manually call this endpoint when you see the borrower
// has sent money via eSewa.
//
// For production: set up an eSewa webhook or a polling job that watches
// the borrower's eSewa account and auto-calls this route.
//
// Body: {
//   borrowerAddress: string,  — borrower's Solana wallet
//   loanId: number,           — which loan they're repaying
//   amountNPR: number,        — repayment amount in NPR
//   esewaRef: string          — eSewa transaction reference (for your records)
// }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/record", async (req, res) => {
  try {
    const { borrowerAddress, loanId, amountNPR, esewaRef } = req.body;

    if (!borrowerAddress || loanId === undefined || !amountNPR) {
      res.status(400).json({
        error: "borrowerAddress, loanId, and amountNPR are required",
      });
      return;
    }

    const loan = await fetchLoanRequest(borrowerAddress, Number(loanId));
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const fraud = assessFraudRisk({
      loan,
      amountNPR: Number(amountNPR),
    });

    if (fraud.decision === "block") {
      res.status(422).json({
        success: false,
        message: "Repayment blocked by fraud rules",
        fraud,
      });
      return;
    }

    console.log(
      `💰 Recording repayment of NPR ${amountNPR} for loan ${loanId}`,
    );
    console.log(`   eSewa ref: ${esewaRef || "not provided"}`);

    const txSignature = await recordRepayment(
      borrowerAddress,
      loanId,
      amountNPR,
    );

    res.json({
      success: true,
      message: `Repayment of NPR ${amountNPR} recorded on-chain`,
      onChainTx: txSignature,
      esewaRef,
      fraud,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record repayment";
    console.error("❌ Repayment record error:", message);
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/repayment/webhook
//
// Placeholder for future eSewa webhook integration.
// When eSewa supports webhooks, they'll POST payment confirmations here.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/webhook", (req, res) => {
  try {
    // TODO: verify eSewa webhook signature here
    const payload = req.body;
    console.log("📬 eSewa webhook received:", payload);

    // Parse the webhook payload (format depends on eSewa's API)
    // const { merchantCode, transactionCode, amount, status } = payload;

    // if (status === "COMPLETE") {
    //   await recordRepayment(borrowerAddress, loanId, amount);
    // }

    res.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("❌ Webhook error:", message);
    res.status(500).json({ error: message });
  }
});

export default router;
