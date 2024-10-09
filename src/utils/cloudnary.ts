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
interface CloudinaryUploadResult {
  // public_id?: string;
  url: string;
  // Add other properties as needed based on Cloudinary's response
}
// const uploadOnCloudnary = async (localFilePath:string)Promise<CloudinaryUploadResult | null> => {
//   try {
//     if (!localFilePath) return null;
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//     });
//     logger.info("file uploaded on cloudnary. file src : " + response);
//     fs.unlinkSync(localFilePath);
//     return response;
//   } catch (error) {
//     fs.unlinkSync(localFilePath);
//     return null;
//   }
// };

export const uploadOnCloudnary = async (
  localFilePath: string,
): Promise<CloudinaryUploadResult | never> => {
  try {
    if (!localFilePath) {
      throw new ApiError(404, "File is missing cant upload file to cloudinary");
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // logger.info(
    //   "File uploaded on Cloudinary. File src: " + JSON.stringify(response,null),
    // );
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    logger.error("Error uploading file to Cloudinary:", error);
    fs.unlinkSync(localFilePath);
    throw new ApiError(
      500,
      "Something went wrong while uploading file to cloudnary",
    );
  }
};
