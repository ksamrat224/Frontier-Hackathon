import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import creditRoutes from "./routes/credit";
import loanRoutes from "./routes/loan";
import repaymentRoutes from "./routes/repayment";
import { validateSolanaEnv } from "./utils/solana";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

try {
  validateSolanaEnv();
} catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "Failed to validate Solana env";
  console.error(`❌ Startup validation failed: ${message}`);
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/credit", creditRoutes); // eSewa upload + credit score
app.use("/api/loan", loanRoutes); // loan disbursal
app.use("/api/repayment", repaymentRoutes); // repayment recording

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(` SaathiLoan oracle backend running on port ${PORT}`);
});
