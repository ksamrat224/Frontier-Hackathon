"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fraudRules_1 = require("../services/fraudRules");
const solanaOracle_1 = require("../services/solanaOracle");
const router = express_1.default.Router();
const reviewStore = new Map();
function reviewKey(borrowerAddress, loanId) {
    return `${borrowerAddress}:${loanId}`;
}
router.get("/open", async (_, res) => {
    try {
        const loans = await (0, solanaOracle_1.fetchOpenLoans)();
        res.json({ count: loans.length, loans });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch open loans";
        res.status(500).json({ error: message });
    }
});
router.get("/borrower/:borrowerAddress", async (req, res) => {
    try {
        const { borrowerAddress } = req.params;
        const loans = await (0, solanaOracle_1.fetchBorrowerLoans)(borrowerAddress);
        res.json({ count: loans.length, loans });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch borrower loans";
        res.status(500).json({ error: message });
    }
});
router.get("/lender/:lenderAddress/positions", async (req, res) => {
    try {
        const { lenderAddress } = req.params;
        const positions = await (0, solanaOracle_1.fetchLenderPositions)(lenderAddress);
        res.json({ count: positions.length, positions });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch lender positions";
        res.status(500).json({ error: message });
    }
});
router.get("/:borrowerAddress/:loanId(\\d+)", async (req, res) => {
    try {
        const { borrowerAddress, loanId } = req.params;
        const parsedLoanId = Number(loanId);
        if (!Number.isFinite(parsedLoanId)) {
            res.status(400).json({ error: "loanId must be a number" });
            return;
        }
        const loan = await (0, solanaOracle_1.fetchLoanRequest)(borrowerAddress, parsedLoanId);
        if (!loan) {
            res.status(404).json({ error: "Loan not found" });
            return;
        }
        const review = reviewStore.get(reviewKey(borrowerAddress, parsedLoanId));
        res.json({ loan, review: review ?? null });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch loan details";
        res.status(500).json({ error: message });
    }
});
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
        const existingLoan = await (0, solanaOracle_1.fetchLoanRequest)(borrowerAddress, Number(loanId));
        if (!existingLoan) {
            res.status(404).json({ error: "Loan not found" });
            return;
        }
        const fraud = (0, fraudRules_1.assessFraudRisk)({ loan: existingLoan });
        if (fraud.decision === "block") {
            res.status(422).json({
                success: false,
                message: "Disbursement blocked by fraud rules",
                fraud,
            });
            return;
        }
        console.log(`💸 Disbursing loan ${loanId} for ${borrowerAddress}...`);
        const txSignature = await (0, solanaOracle_1.disburseLoan)(borrowerAddress, loanId);
        res.json({
            success: true,
            message: "Loan disbursed successfully",
            onChainTx: txSignature,
            fraud,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Disburse failed";
        console.error("❌ Disburse error:", message);
        res.status(500).json({ error: message });
    }
});
router.get("/admin/reviews", (_, res) => {
    const reviews = Array.from(reviewStore.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ count: reviews.length, reviews });
});
router.post("/admin/review", async (req, res) => {
    try {
        const { borrowerAddress, loanId, status, notes } = req.body;
        if (!borrowerAddress || loanId === undefined || !status) {
            res.status(400).json({ error: "borrowerAddress, loanId, and status are required" });
            return;
        }
        if (!["pending", "approved", "rejected"].includes(status)) {
            res.status(400).json({ error: "status must be pending, approved, or rejected" });
            return;
        }
        const loan = await (0, solanaOracle_1.fetchLoanRequest)(borrowerAddress, Number(loanId));
        if (!loan) {
            res.status(404).json({ error: "Loan not found" });
            return;
        }
        const review = {
            borrowerAddress,
            loanId: Number(loanId),
            status,
            notes,
            updatedAt: new Date().toISOString(),
        };
        reviewStore.set(reviewKey(borrowerAddress, Number(loanId)), review);
        res.json({
            success: true,
            message: "Review status updated",
            review,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update review";
        res.status(500).json({ error: message });
    }
});
exports.default = router;
