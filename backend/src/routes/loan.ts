import express from "express";
import { disburseLoan } from "../services/solanaOracle";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/loan/disburse
//
// Trigger disbursal of a fully funded loan.
// In production this would be called automatically when the loan hits
// "Funded" status (you can poll on-chain or emit events).
//
// Body: { borrowerAddress: string, loanId: number }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/disburse", async (req, res) => {
  try {
    const { borrowerAddress, loanId } = req.body;

    if (!borrowerAddress || loanId === undefined) {
      res
        .status(400)
        .json({ error: "borrowerAddress and loanId are required" });
      return;
    }

    console.log(`💸 Disbursing loan ${loanId} for ${borrowerAddress}...`);

    const txSignature = await disburseLoan(borrowerAddress, loanId);

    res.json({
      success: true,
      message: "Loan disbursed successfully",
      onChainTx: txSignature,
    });
  } catch (err: any) {
    console.error("❌ Disburse error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
