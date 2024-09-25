
// import multer from "multer";
// import { Request } from "express";
// const storage = multer.diskStorage({
//   destination: function (req:Request, file, cb) {
//     cb(null, "./public/temp");
//   },
//   filename: function (req:Request, file, cb) {
//     cb(null, file.originalname);
//   },
// });

// const upload = multer({ storage: storage });
// export default upload;

import multer, { StorageEngine, FileFilterCallback } from "multer";
import { Request } from "express";

const storage: StorageEngine = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, "./public/temp");
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

export default upload;