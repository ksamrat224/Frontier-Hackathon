"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const credit_1 = __importDefault(require("./routes/credit"));
const loan_1 = __importDefault(require("./routes/loan"));
const repayment_1 = __importDefault(require("./routes/repayment"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/credit", credit_1.default); // eSewa upload + credit score
app.use("/api/loan", loan_1.default); // loan disbursal
app.use("/api/repayment", repayment_1.default); // repayment recording
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.listen(PORT, () => {
    console.log(`🚀 SaathiLoan oracle backend running on port ${PORT}`);
});
