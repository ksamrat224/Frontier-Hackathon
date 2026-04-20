import express from "express";
import {
  disburseLoanController,
  getAdminReviews,
  getBorrowerLoans,
  getLenderPositions,
  getLoanDetail,
  getOpenLoans,
  upsertAdminReview,
} from "../controllers/loanController";

const router = express.Router();
router.get("/open", getOpenLoans);
router.get("/borrower/:borrowerAddress", getBorrowerLoans);
router.get("/lender/:lenderAddress/positions", getLenderPositions);
router.get("/:borrowerAddress/:loanId(\\d+)", getLoanDetail);
router.post("/disburse", disburseLoanController);
router.get("/admin/reviews", getAdminReviews);
router.post("/admin/review", upsertAdminReview);

export default router;
