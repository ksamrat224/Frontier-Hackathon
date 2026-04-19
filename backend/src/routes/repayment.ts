import express from "express";
import { recordRepayment } from "../services/solanaOracle";

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
    });
  } catch (err: any) {
    console.error("❌ Repayment record error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/repayment/webhook
//
// Placeholder for future eSewa webhook integration.
// When eSewa supports webhooks, they'll POST payment confirmations here.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/webhook", async (req, res) => {
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
  } catch (err: any) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
