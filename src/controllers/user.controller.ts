import ApiError from "../utils/ApiError.ts";
import ApiResponse from "../utils/ApiResponse.ts";
import asyncHandler from "../utils/asyncHandler.ts";
import { Request, Response } from "express";
import User from "../models/user.model.ts";
import uploadOnCloudnary from "../utils/cloudnary.ts";

interface RequestUser extends Request {
    files?:
        | {
            [fieldname: string]: Express.Multer.File[];
        }
        | Express.Multer.File[]
        | undefined;
    file?: Express.Multer.File;
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



export { registerUser };
