import ApiError from "../utils/ApiError.ts";
import ApiResponse from "../utils/ApiResponse.ts";
import asyncHandler from "../utils/asyncHandler.ts";
import { Request, Response } from "express";
import User, { IUser } from "../models/user.model";
import uploadOnCloudnary from "../utils/cloudnary.ts";
import logger from "../utils/logger.ts";
import jwt from "jsonwebtoken";

interface RequestUser extends Request {
    files?:
        | {
            [fieldname: string]: Express.Multer.File[];
        }
        | Express.Multer.File[]
        | undefined;
    file?: Express.Multer.File;
    user?: IUser;
}
interface Tokens {
    refreshToken: string;
    accessToken: string;
}
interface HttpOptions {
    httpOnly: boolean;
    secure: boolean;
}
interface DecodedToken {
    _id: string;
    email: string;
    username: string;
    fullname: string;
    iat: number;
    exp: number;
}
async function generateAccessTokenAndRefreshToken(
    userId: string,
): Promise<Tokens | never> {
    try {
        const user = await User.findById(userId) as IUser | null;
        if (user) {
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();
            user.refreshToken = refreshToken;
            await user.save({ validateBeforeSave: false });
            return { accessToken, refreshToken };
        } else {
            throw new ApiError(404, "User not found");
        }
    } catch (error) {
        logger.info(error);
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh token",
        );
    }
}

const registerUser = asyncHandler(async (req: RequestUser, res: Response) => {
    const { fullname, email, username, password } = req.body;
    if (
        [fullname, email, username, password].some((field) =>
            field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fileds are missing");
    }
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) throw new ApiError(401, "User already exists");

    const avatarFile = req.files && "avatar" in req.files
        ? req.files.avatar[0]
        : req.file;
    const coverImageFile = req.files && "coverImage" in req.files
        ? req.files.coverImage[0]
        : undefined;
    // logger.info(avatarFile);
    // logger.info(coverImageFile);
    const avatarLocalPath = avatarFile?.path;
    const coverImageLocalPath = coverImageFile?.path || undefined;
    if (!avatarLocalPath) throw new ApiError(404, "Avatar image not found");

    const avatarCloudnaryUrl = await uploadOnCloudnary(avatarLocalPath);
    if (!avatarCloudnaryUrl) {
        throw new ApiError(500, "Unable to extract avatar url from cloudnary");
    }

    let coverImageCloudnaryUrl;
    if (typeof coverImageLocalPath !== "undefined") {
        coverImageCloudnaryUrl = await uploadOnCloudnary(
            coverImageLocalPath,
        );
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatarCloudnaryUrl?.url,
        coverImage: coverImageCloudnaryUrl?.url || "",
    });
    const userDetails = await User.findById(user?._id).select([
        "-password",
        "-refreshToken",
    ]);
    if (!userDetails) {
        throw new ApiError(
            500,
            "Something went wrong while fetching user details from Db",
        );
    }
    res.status(201).json(
        new ApiResponse(201, userDetails, "User succesfully registered"),
    );
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { username, password, email } = req.body;

    // validate

    const user = await User.findOne({ $or: [{ username }, { email }] }) as
        | IUser
        | null;

    if (!user) {
        throw new ApiError(
            404,
            "User alredy exixts with this email or username",
        );
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400, "Entered password is not correct");
    }

    const { accessToken, refreshToken }: Tokens =
        await generateAccessTokenAndRefreshToken(user._id as string);

    const loggedInUser = await User.findById(user._id as string).select([
        "-password",
        "-refreshToken",
    ]);

    const cookieOptions: HttpOptions = {
        httpOnly: true,
        secure: true,
    };

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User login Successfully",
            ),
        );
});

const logoutUser = asyncHandler(async (req: RequestUser, res: Response) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        },
    ) as IUser;
    const cookieOptions: HttpOptions = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logout successfully"));
});

const updateRefreshToken = asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken ||
        req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(404, "Refresh token not found");
    }
    logger.info(incomingRefreshToken);

    if (process.env.REFRESH_TOKEN_SECRET === undefined) {
        throw new ApiError(404, "Refresh token secret not found");
    }

    const decodeIncomingRefreshToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET,
    ) as DecodedToken;
    logger.info(JSON.stringify(decodeIncomingRefreshToken));

    try {
        const user = await User.findById(
            decodeIncomingRefreshToken?._id as string,
        ) as IUser;
        logger.info(user);
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid User");
        }

        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(user?._id as string);

        const cookieOptions: HttpOptions = {
            httpOnly: true,
            secure: true,
        };

        return res.status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Tokens updated successfully",
                ),
            );
    } catch (error) {
        throw new ApiError(
            500,
            error + " someting went wrong while updating refresh token",
        );
    }
});

const updatePassword = asyncHandler(async (req: RequestUser, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    if (!(oldPassword || newPassword)) {
        throw new ApiError(400, "Old password and new password doesnt match");
    }
    const user = await User.findById(req.user?._id) as IUser;

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "password entered by user is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password updated successfully"),
    );
});

const getCurrentUser = asyncHandler(async (req: RequestUser, res: Response) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Received Current User successfully"),
    );
});

const updateAccountDetails = asyncHandler(
    async (req: RequestUser, res: Response) => {
        const { fullname, email } = req.body;

        if (!(fullname || email)) {
            throw new ApiError(404, "account fields are missing");
        }

        const user = await User.findByIdAndUpdate(
            req?.user?._id,
            {
                $set: { fullname, email },
            },
            {
                new: true,
            },
        ).select(["-password", "-refreshToken"]) as IUser;

        return res.status(200).json(
            new ApiResponse(
                200,
                user,
                "User account details updated successfully",
            ),
        );
    },
);

const updateAvatarPhoto = asyncHandler(
    async (req: RequestUser, res: Response) => {
        const avatarFile = req.file;
        logger.info(avatarFile?.path);
        if (!avatarFile) throw new ApiError(404, "Avatar image not found");

        const avatarOnCloudnary = await uploadOnCloudnary(avatarFile?.path);
        // logger.info(JSON.stringify(avatarOnCloudnary));

        const user = await User.findByIdAndUpdate(
            req?.user?._id,
            {
                $set: { avatar: avatarOnCloudnary?.url || "" },
            },
            {
                new: true,
            },
        ).select(["-password", "-refreshToken"]) as IUser;

        return res.status(201).json(
            new ApiResponse(
                201,
                user?.avatar,
                "User avatar updated successfully",
            ),
        );
    },
);

const updateCoverImagePhoto = asyncHandler(
    async (req: RequestUser, res: Response) => {
        const coverImage = req.file;
        logger.info(coverImage?.path);
        if (!coverImage) throw new ApiError(404, "Cover image not found");

        const coverImageOnCloudnary = await uploadOnCloudnary(coverImage?.path);
        // logger.info(JSON.stringify(avatarOnCloudnary));

        const user = await User.findByIdAndUpdate(
            req?.user?._id,
            {
                $set: { avatar: coverImageOnCloudnary?.url || "" },
            },
            {
                new: true,
            },
        ).select(["-password", "-refreshToken"]) as IUser;

        return res.status(201).json(
            new ApiResponse(
                201,
                user?.avatar,
                "User cover image updated successfully",
            ),
        );
    },
);

export {
    getCurrentUser,
    loginUser,
    logoutUser,
    registerUser,
    updateAccountDetails,
    updateAvatarPhoto,
    updateCoverImagePhoto,
    updatePassword,
    updateRefreshToken,
};
