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
interface CloudinaryVideoResutl{
  hlsurl: string;
  duration: string | number;
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

const uploadOnCloudnary = async (
  localFilePath: string,
): Promise<CloudinaryUploadResult | never> => {
  try {
    if (!localFilePath) {
      throw new ApiError(
        404,
        "Image file is missing cant upload file to cloudinary",
      );
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

const uploadVideoOnCloudinary = async (
  localFilePath: string,
): Promise<CloudinaryVideoResutl | never> => {
  try {
    if (!localFilePath) {
      throw new ApiError(
        404,
        "Vidoe file is missing cant upload file to cloudinary",
      );
    }

    // console.log("uploading video...");
    logger.info("uploading video...");

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(localFilePath, {
        resource_type: "video",
        // folder: "videotube/videos",
        chunk_size: 6000000, // 6MB chunks
        eager: [
          {
            streaming_profile: "hd",
            format: "m3u8", // HLS format
          },
        ],
        timeout: 600000, // Increased timeout to 10 minutes
      }, (error, result: any) => {
        if (error) {
          // console.log("CLOUDINARY :: FILE UPLOAD ERROR ", error);
          logger.error("CLOUDINARY :: FILE UPLOAD ERROR ", error);
          reject(error);
        } else {
          // console.log("cloudinary video file", result);
          logger.info("cloudinary video file", result);

          const hlsurl = result.eager?.[0]?.secure_url;

          if (!hlsurl) {
            // console.log("HLS URL not found in Cloudinary response");
            logger.info("HLS URL not found in Cloudinary response");
            reject(new Error("HLS URL not generated"));
          } else {
            resolve({ ...result, hlsurl });
          }
        }

        // Clean up local file after upload attempt
        fs.unlink(localFilePath, (unlinkError) => {
          if (unlinkError) {
            // console.log("Error deleting local file:", unlinkError);
            logger.info("Error deleting local file:", unlinkError);
          }
        });
      });
    });
  } catch (error: any) {
    // console.log("CLOUDINARY :: FILE UPLOAD ERROR ", error);
    logger.error("CLOUDINARY :: FILE UPLOAD ERROR ", error);
    throw new ApiError(
      500,
      error?.message ||
        "someting went wrong wile uploading vidoe in cloudnary ",
    );
  }
};

const deleteImageOnCloudinary = async (URL:any) => {
  try {
    if (!URL) throw new ApiError(404,"Image url not found for deleting ");

    let ImageId = URL.match(
      /(?:image|video)\/upload\/v\d+\/videotube\/(photos|videos)\/(.+?)\.\w+$/
    )[2];

    console.log("deleting image from cloudinary...");

    const cldnry_res = await cloudinary.uploader.destroy(
      `videotube/photos/${ImageId}`,
      {
        resource_type: "image",
      }
    );

    return cldnry_res;
  } catch (error) {
    console.log("CLOUDINARY :: FILE Delete ERROR ", error);
    return false;
  }
};

const deleteVideoOnCloudinary = async(URL:any) => {
  try {
    if (!URL) return false;

    let VideoId = URL.match(
      /(?:image|video)\/upload\/v\d+\/videotube\/(photos|videos)\/(.+?)\.\w+$/
    )[2];

    console.log("deleting video from cloudinary...");

    const cldnry_res = await cloudinary.uploader.destroy(
      `videotube/videos/${VideoId}`,
      {
        resource_type: "video",
      }
    );

    return cldnry_res;
  } catch (error) {
    console.log("CLOUDINARY :: FILE Delete ERROR ", error);
    return false;
  }
};

export { uploadVideoOnCloudinary, uploadOnCloudnary };
