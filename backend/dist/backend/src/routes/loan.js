"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const solanaOracle_1 = require("../services/solanaOracle");
const router = express_1.default.Router();
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
        const txSignature = await (0, solanaOracle_1.disburseLoan)(borrowerAddress, loanId);
        res.json({
            success: true,
            message: "Loan disbursed successfully",
            onChainTx: txSignature,
        });
    }
    catch (err) {
        console.error("❌ Disburse error:", err.message);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
