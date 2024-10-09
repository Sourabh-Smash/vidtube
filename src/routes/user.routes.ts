import { Router } from "express";
import {
    getCurrentUser,
    getUserChannelDetails,
    getUserWatchHistory,
    loginUser,
    logoutUser,
    registerUser,
    updateAccountDetails,
    updateAvatarPhoto,
    updateCoverImagePhoto,
    updatePassword,
    updateRefreshToken,
} from "../controllers/user.controller.ts";
import { upload } from "../middlewares/multer.middleware.ts";
import { verifyJwt } from "../middlewares/auth.middleware.ts";
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
router.route("/update-pass").post(verifyJwt, updatePassword);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/update-user-details").patch(verifyJwt, updateAccountDetails);
router.route("/update-avatar").post(
    upload.single("avatar"),
    verifyJwt,
    updateAvatarPhoto,
);
router.route("/update-cover-image").post(
    upload.single("coverImage"),
    verifyJwt,
    updateCoverImagePhoto,
);
router.route("/c/:username").get(verifyJwt, getUserChannelDetails);
router.route("/history").get(verifyJwt, getUserWatchHistory);
export default router;
