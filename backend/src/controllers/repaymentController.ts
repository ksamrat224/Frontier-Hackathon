import type { RequestHandler } from "express";
import { assessFraudRisk } from "../services/fraudRules";
import { fetchLoanRequest, recordRepayment } from "../services/solanaOracle";
import { hasText, parseRequiredNumber, toErrorMessage } from "../utils/request";

export const recordRepaymentController: RequestHandler = async (req, res) => {
  try {
    const { borrowerAddress, loanId, amountNPR, esewaRef } = req.body as {
      borrowerAddress?: unknown;
      loanId?: unknown;
      amountNPR?: unknown;
      esewaRef?: unknown;
    };

    if (
      !hasText(borrowerAddress) ||
      loanId === undefined ||
      amountNPR === undefined
    ) {
      res.status(400).json({
        error: "borrowerAddress, loanId, and amountNPR are required",
      });
      return;
    }

    const parsedLoanId = parseRequiredNumber(loanId);
    const parsedAmountNPR = parseRequiredNumber(amountNPR);

    if (parsedLoanId === null || parsedAmountNPR === null) {
      res
        .status(400)
        .json({ error: "loanId and amountNPR must be valid numbers" });
      return;
    }

    const loan = await fetchLoanRequest(borrowerAddress, parsedLoanId);
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const fraud = assessFraudRisk({
      loan,
      amountNPR: parsedAmountNPR,
    });

    if (fraud.decision === "block") {
      res.status(422).json({
        success: false,
        message: "Repayment blocked by fraud rules",
        fraud,
      });
      return;
    }

    const txSignature = await recordRepayment(
      borrowerAddress,
      parsedLoanId,
      parsedAmountNPR,
    );

    res.json({
      success: true,
      message: `Repayment of NPR ${parsedAmountNPR} recorded on-chain`,
      onChainTx: txSignature,
      esewaRef: hasText(esewaRef) ? esewaRef : undefined,
      fraud,
    });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to record repayment");
    res.status(500).json({ error: message });
  }
};

export const repaymentWebhook: RequestHandler = (req, res) => {
  try {
    const payload = req.body;
    console.log("eSewa webhook received:", payload);
    res.json({ received: true });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Webhook handler failed");
    res.status(500).json({ error: message });
  }
};
