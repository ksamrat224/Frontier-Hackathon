import fs from "fs";
import type { RequestHandler } from "express";
import { computeCreditScore, parseEsewaPdf } from "../services/esewaParser";
import { fetchCreditProfile, writeCreditScore } from "../services/solanaOracle";
import { hasText, toErrorMessage } from "../utils/request";

export const uploadCreditProfileController: RequestHandler = async (
  req,
  res,
) => {
  const filePath = req.file?.path;

  try {
    const borrowerAddress = req.body.borrowerAddress as unknown;

    if (!hasText(borrowerAddress)) {
      res.status(400).json({ error: "borrowerAddress is required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "PDF file is required" });
      return;
    }

    const esewaProfile = await parseEsewaPdf(req.file.path);

    if (esewaProfile.txCount === 0) {
      res.status(422).json({
        error:
          "Could not extract transactions from PDF. Make sure this is an eSewa statement.",
      });
      return;
    }

    const scoreResult = computeCreditScore(esewaProfile);

    const txSignature = await writeCreditScore(
      borrowerAddress,
      scoreResult.score,
      esewaProfile.totalVolumeNPR,
      esewaProfile.txCount,
    );

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
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Something went wrong");
    res.status(500).json({ error: message });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

export const getCreditProfileController: RequestHandler = async (req, res) => {
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
  } catch (err: unknown) {
    const message = toErrorMessage(err, "Failed to fetch credit profile");
    res.status(500).json({ error: message });
  }
};
