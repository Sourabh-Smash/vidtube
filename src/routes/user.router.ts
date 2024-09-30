import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    updateRefreshToken,
} from "../controllers/user.controller.ts";
import upload from "../middlewares/multer.middleware.ts";
import verifyJwt from "../middlewares/auth.middleware.ts";
const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser,
);

router.route("/login").post(loginUser);

// secure routers
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/update-refresh").post(updateRefreshToken);
export default router;
