import ApiError from "../utils/ApiError.ts";
import ApiResponse from "../utils/ApiResponse.ts";
import asyncHandler from "../utils/asyncHandler.ts";
import { Request, Response } from "express";
const healthCheck = asyncHandler(async (req:Request, res:Response) => {
    return res.status(200).json(new ApiResponse(200, 'OK', "health check passed"));
})

export { healthCheck };