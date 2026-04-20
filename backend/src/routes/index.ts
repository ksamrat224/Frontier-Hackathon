import { Router } from "express";
import creditRoutes from "./credit";
import loanRoutes from "./loan";
import repaymentRoutes from "./repayment";

const router = Router();

router.use("/credit", creditRoutes);
router.use("/loan", loanRoutes);
router.use("/repayment", repaymentRoutes);

export default router;
