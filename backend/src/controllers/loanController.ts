import type { RequestHandler } from "express";
import { assessFraudRisk } from "../services/fraudRules";
import {
  disburseLoan,
  fetchBorrowerLoans,
  fetchLenderPositions,
  fetchLoanRequest,
  fetchOpenLoans,
} from "../services/solanaOracle";
import { getReview, listReviews, upsertReview } from "../store/reviewStore";
import { isReviewStatus } from "../types/review";
import { hasText, parseRequiredNumber, toErrorMessage } from "../utils/request";

export const getOpenLoans: RequestHandler = async (_, res) => {
  try {
    const loans = await fetchOpenLoans();
    res.json({ count: loans.length, loans });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to fetch open loans");
    res.status(500).json({ error: message });
  }
};

export const getBorrowerLoans: RequestHandler = async (req, res) => {
  try {
    const { borrowerAddress } = req.params;
    const loans = await fetchBorrowerLoans(borrowerAddress);
    res.json({ count: loans.length, loans });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to fetch borrower loans");
    res.status(500).json({ error: message });
  }
};

export const getLenderPositions: RequestHandler = async (req, res) => {
  try {
    const { lenderAddress } = req.params;
    const positions = await fetchLenderPositions(lenderAddress);
    res.json({ count: positions.length, positions });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to fetch lender positions");
    res.status(500).json({ error: message });
  }
};

export const getLoanDetail: RequestHandler = async (req, res) => {
  try {
    const { borrowerAddress, loanId } = req.params;
    const parsedLoanId = parseRequiredNumber(loanId);

    if (parsedLoanId === null) {
      res.status(400).json({ error: "loanId must be a number" });
      return;
    }

    const loan = await fetchLoanRequest(borrowerAddress, parsedLoanId);
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const review = getReview(borrowerAddress, parsedLoanId);
    res.json({ loan, review });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to fetch loan details");
    res.status(500).json({ error: message });
  }
};

export const disburseLoanController: RequestHandler = async (req, res) => {
  try {
    const { borrowerAddress, loanId } = req.body as {
      borrowerAddress?: unknown;
      loanId?: unknown;
    };

    if (!hasText(borrowerAddress) || loanId === undefined) {
      res.status(400).json({ error: "borrowerAddress and loanId are required" });
      return;
    }

    const parsedLoanId = parseRequiredNumber(loanId);
    if (parsedLoanId === null) {
      res.status(400).json({ error: "loanId must be a number" });
      return;
    }

    const existingLoan = await fetchLoanRequest(borrowerAddress, parsedLoanId);
    if (!existingLoan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const fraud = assessFraudRisk({ loan: existingLoan });
    if (fraud.decision === "block") {
      res.status(422).json({
        success: false,
        message: "Disbursement blocked by fraud rules",
        fraud,
      });
      return;
    }

    const txSignature = await disburseLoan(borrowerAddress, parsedLoanId);

    res.json({
      success: true,
      message: "Loan disbursed successfully",
      onChainTx: txSignature,
      fraud,
    });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Disburse failed");
    res.status(500).json({ error: message });
  }
};

export const getAdminReviews: RequestHandler = (_, res) => {
  const reviews = listReviews();
  res.json({ count: reviews.length, reviews });
};

export const upsertAdminReview: RequestHandler = async (req, res) => {
  try {
    const { borrowerAddress, loanId, status, notes } = req.body as {
      borrowerAddress?: unknown;
      loanId?: unknown;
      status?: unknown;
      notes?: unknown;
    };

    if (!hasText(borrowerAddress) || loanId === undefined || !isReviewStatus(status)) {
      res
        .status(400)
        .json({ error: "borrowerAddress, loanId, and status are required" });
      return;
    }

    const parsedLoanId = parseRequiredNumber(loanId);
    if (parsedLoanId === null) {
      res.status(400).json({ error: "loanId must be a number" });
      return;
    }

    const loan = await fetchLoanRequest(borrowerAddress, parsedLoanId);
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const review = {
      borrowerAddress,
      loanId: parsedLoanId,
      status,
      notes: hasText(notes) ? notes : undefined,
      updatedAt: new Date().toISOString(),
    };

    upsertReview(review);

    res.json({
      success: true,
      message: "Review status updated",
      review,
    });
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to update review");
    res.status(500).json({ error: message });
  }
};
