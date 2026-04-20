import express from "express";
import {
  recordRepaymentController,
  repaymentWebhook,
} from "../controllers/repaymentController";

const router = express.Router();
router.post("/record", recordRepaymentController);
router.post("/webhook", repaymentWebhook);

export default router;
