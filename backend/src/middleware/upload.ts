import multer from "multer";

export const pdfUpload = multer({
  dest: "uploads/",
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
      return;
    }

    cb(new Error("Only PDF files are accepted"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});
