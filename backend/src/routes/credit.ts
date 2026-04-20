import express from "express";
import {
  getCreditProfileController,
  uploadCreditProfileController,
} from "../controllers/creditController";
import { pdfUpload } from "../middleware/upload";

const router = express.Router();

router.post("/upload", pdfUpload.single("file"), uploadCreditProfileController);
router.get("/:borrowerAddress", getCreditProfileController);

export default router;
