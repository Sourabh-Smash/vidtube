import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { logger } from "./logger.ts";
import { ApiError } from "./ApiError.ts";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDNARY_CLOUD_NAME,
    api_key: process.env.CLOUDNARY_API_KEY,
    api_secret: process.env.CLOUDNARY_API_SECRET,
});

export async function uploadVideoOnCloudnary(file: any): Promise<any> {
    try {
        const result: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_large(
                file,
                {
                    resource_type: "video",
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                },
            );
        });
        logger.info(`> Result: ${result.secure_url}`);
        // console.log(`> Result: ${result.secure_url}`);
    } catch (error) {
        logger.error(error);
        throw new ApiError(
            500,
            "Something went wrong while uploading video in cloudnary",
        );
    }
}
