import { ApiError } from "../utils/ApiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { NextFunction, Request, Response } from "express";
import {User, IUser } from "../models/user.model";
import { logger } from "../utils/logger.ts";
import jwt from "jsonwebtoken";

interface DecodedToken {
    _id: string;
    email: string;
    username: string;
    fullname: string;
    iat: number;
    exp: number;
}
interface UserRequest extends Request {
    user?: IUser;
}

export const verifyJwt = asyncHandler(
    async (req: UserRequest, _: Response, next: NextFunction) => {
        try {
            const token = req.cookies?.accessToken ||
                req.header("Authorization")?.replace("Bearer ", "");
            // logger.info(token);
            if (!token) {
                throw new ApiError(401, "Invalid token found from req handler");
            }

            if (process.env.ACCESS_TOKEN_SECRET === undefined) {
                throw new ApiError(404, "AccessToken secret not found");
            }
            const decodedToken = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET,
            ) as DecodedToken;
            // logger.info(JSON.stringify(decodedToken));
            if (!decodedToken) {
                throw new ApiError(
                    500,
                    "Something went wrong while verifying decoded access Token",
                );
            }
            const user = await User.findById(decodedToken?._id as string)
                .select([
                    "-password",
                    "-accessToken",
                ]) as IUser;
            // logger.info(user);
            if (!user) {
                throw new ApiError(
                    404,
                    "Invalid access token no user with this token found",
                );
            }
            req.user = user;
            next();
        } catch (error) {
            logger.error(error);
            throw new ApiError(
                500,
                "Something went wrong while authorization",
            );
        }
    },
);
