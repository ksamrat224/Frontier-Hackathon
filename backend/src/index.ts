import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes";
import { validateSolanaEnv } from "./utils/solana";
import { toErrorMessage } from "./utils/request";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

try {
  validateSolanaEnv();
} catch (err: unknown) {
  const message = toErrorMessage(err, "Failed to validate Solana env");
  console.error(`❌ Startup validation failed: ${message}`);
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(` SaathiLoan oracle backend running on port ${PORT}`);
});
