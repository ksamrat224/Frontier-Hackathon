import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseEsewaPdf, computeCreditScore } from "../services/esewaParser";
import { writeCreditScore, fetchCreditProfile } from "../services/solanaOracle";

const router = express.Router();

// ── File upload setup ─────────────────────────────────────────────────────────
const upload = multer({
  dest: "uploads/",
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/credit/upload
//
// Frontend sends: multipart form with:
//   - file: eSewa statement PDF
//   - borrowerAddress: Solana wallet address (string)
//
// Backend does:
//   1. Parse the PDF
//   2. Compute credit score
//   3. Write score on-chain via oracle
//   4. Return score + breakdown to frontend
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const { borrowerAddress } = req.body;

    if (!borrowerAddress) {
      res.status(400).json({ error: "borrowerAddress is required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "PDF file is required" });
      return;
    }

    console.log(`📄 Parsing eSewa PDF for ${borrowerAddress}...`);

    // Step 1: Parse PDF
    const esewaProfile = await parseEsewaPdf(req.file.path);

    if (esewaProfile.txCount === 0) {
      res.status(422).json({
        error:
          "Could not extract transactions from PDF. Make sure this is an eSewa statement.",
      });
      return;
    }

    // Step 2: Compute credit score
    const scoreResult = computeCreditScore(esewaProfile);

    console.log(
      `📊 Credit score computed: ${scoreResult.score} for ${borrowerAddress}`,
    );
    console.log(`   Breakdown:`, scoreResult.breakdown);

    // Step 3: Write to Solana
    const txSignature = await writeCreditScore(
      borrowerAddress,
      scoreResult.score,
      esewaProfile.totalVolumeNPR,
      esewaProfile.txCount,
    );

    // Step 4: Respond to frontend
    res.json({
      success: true,
      creditScore: scoreResult.score,
      breakdown: scoreResult.breakdown,
      stats: {
        totalVolumeNPR: esewaProfile.totalVolumeNPR,
        txCount: esewaProfile.txCount,
        monthlyAvgNPR: esewaProfile.monthlyAvgNPR,
        oldestTxDate: esewaProfile.oldestTxDate,
        newestTxDate: esewaProfile.newestTxDate,
      },
      onChainTx: txSignature,
      message:
        scoreResult.score >= 300
          ? "You are eligible to request a loan!"
          : "Your credit score is too low (minimum 300). Use eSewa more to improve it.",
    });
  } catch (err: any) {
    console.error("❌ Credit upload error:", err.message);
    res.status(500).json({ error: err.message || "Something went wrong" });
  } finally {
    // Always clean up the uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/credit/:borrowerAddress
//
// Read a borrower's existing credit profile from chain
// Used by lenders to check a borrower's score before funding
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:borrowerAddress", async (req, res) => {
  try {
    const { borrowerAddress } = req.params;
    const profile = await fetchCreditProfile(borrowerAddress);

    if (!profile) {
      res
        .status(404)
        .json({ error: "No credit profile found for this address" });
      return;
    }

    res.json({
      creditScore: profile.creditScore,
      esewaTxCount: profile.esewaTxCount,
      loansRepaidOnTime: profile.loansRepaidOnTime,
      loansDefaulted: profile.loansDefaulted,
      lastUpdated: new Date(
        profile.lastUpdated.toNumber() * 1000,
      ).toISOString(),
    });
  } catch (err: any) {
    console.error("❌ Fetch credit profile error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
