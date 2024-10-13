import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.ts";
import { IUser, User } from "../models/user.model.ts";
import { ApiError } from "../utils/ApiError.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import {
    uploadOnCloudnary,
    uploadVideoOnCloudinary,
} from "../utils/cloudnary.ts";
import { Request, Response } from "express";
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
const getAllVideos = asyncHandler(async (req: RequestUser, res: Response) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        sortBy,
        sortType = "video",
        order,
        userId,
    } = req.query;

    // filter video by given filters
    let filters = { isPublished: true };
    if (isValidObjectId(userId)) {
        filters.owner = new mongoose.Types.ObjectId(userId);
    }

    let pipeline = [
        {
            $match: {
                ...filters,
            },
        },
    ];

    const sort = {};

    // if query is given filter the videos
    if (search) {
        const queryWords = search
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
            .split(" ");
        const filteredWords = queryWords.filter(
            (word) => !stopWords.includes(word),
        );

        console.log("search: ", search);
        console.log("filteredWords: ", filteredWords);

        pipeline.push({
            $addFields: {
                titleMatchWordCount: {
                    $size: {
                        $filter: {
                            input: filteredWords,
                            as: "word",
                            cond: {
                                $in: ["$$word", {
                                    $split: [{ $toLower: "$title" }, " "],
                                }],
                            },
                        },
                    },
                },
            },
        });

        pipeline.push({
            $addFields: {
                descriptionMatchWordCount: {
                    $size: {
                        $filter: {
                            input: filteredWords,
                            as: "word",
                            cond: {
                                $in: [
                                    "$$word",
                                    {
                                        $split: [
                                            { $toLower: "$description" },
                                            " ",
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        });

        sort.titleMatchWordCount = -1;
    }

    // sort the documents
    if (sortBy) {
        sort[sortBy] = parseInt(order);
    } else if (!search && !sortBy) {
        sort["createdAt"] = -1;
    }

    pipeline.push({
        $sort: {
            ...sort,
        },
    });

    // fetch owner detail
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
    );

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const allVideos = await Video.aggregatePaginate(videoAggregate, options);

    const { docs, ...pagingInfo } = allVideos;

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { videos: docs, pagingInfo },
                "All Query Videos Sent Successfully",
            ),
        );
});

const publishAVideo = asyncHandler(async (req: RequestUser, res: Response) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((elem) => elem.trim === "")) {
        throw new ApiError(404, "title or description are missing");
    }

    const videoFile = req.files && "videoFile" in req.files
        ? req.files.videoFile[0]
        : undefined;

    const thumbnailFile = req.files && "thumbnail" in req.files
        ? req.files.thumbnail[0]
        : undefined;

    if (!videoFile) throw new ApiError(404, "Vidoe file is missing");
    if (!thumbnailFile) throw new ApiError(404, "Thumbnail file is missing");

    const vidoeFileLocalPath = videoFile?.path;
    const thumbnailFileLocalPath = thumbnailFile?.path;

    const videoFileOnCloudnary = await uploadVideoOnCloudinary(
        vidoeFileLocalPath,
    );

    if (!videoFileOnCloudnary || !videoFileOnCloudnary?.hlsurl) {
        throw new ApiError(500, "upload video url not found");
    }

    const videoDuration = videoFileOnCloudnary.duration;
    if (!videoDuration) {
        throw new ApiError(
            500,
            "Video duration is missing from Cloudinary response",
        );
    }

    const thumbnailFileOnCloudnary = await uploadOnCloudnary(
        thumbnailFileLocalPath,
    );
    if (!thumbnailFileOnCloudnary) {
        throw new ApiError(500, "Error while uploading thumbnail file");
    }

    const video = await Video.create({
        videoFile: videoFileOnCloudnary.hlsurl,
        title,
        description: description || "No description provided",
        duration: videoDuration,
        thumbnail: thumbnailFileOnCloudnary.url,
        owner: req.user?._id,
    });

    if (!video) throw new ApiError(500, "Error while publishing video");
    return res.status(200).json(
        new ApiResponse(200, video, "Video published successfully"),
    );
});

const getVideoById = asyncHandler(async (req: RequestUser, res: Response) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true,
            },
        },
        // get all likes array
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
                pipeline: [
                    {
                        $match: {
                            liked: true,
                        },
                    },
                    {
                        $group: {
                            _id: "$liked",
                            likeOwners: { $push: "$likedBy" },
                        },
                    },
                ],
            },
        },
        // get all dislikes array
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "dislikes",
                pipeline: [
                    {
                        $match: {
                            liked: false,
                        },
                    },
                    {
                        $group: {
                            _id: "$liked",
                            dislikeOwners: { $push: "$likedBy" },
                        },
                    },
                ],
            },
        },
        // adjust shapes of likes and dislikes
        {
            $addFields: {
                likes: {
                    $cond: {
                        if: {
                            $gt: [{ $size: "$likes" }, 0],
                        },
                        then: { $first: "$likes.likeOwners" },
                        else: [],
                    },
                },
                dislikes: {
                    $cond: {
                        if: {
                            $gt: [{ $size: "$dislikes" }, 0],
                        },
                        then: { $first: "$dislikes.dislikeOwners" },
                        else: [],
                    },
                },
            },
        },
        // fetch owner details
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
        // added like fields
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                duration: 1,
                thumbnail: 1,
                views: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1,
                totalLikes: {
                    $size: "$likes",
                },
                totalDisLikes: {
                    $size: "$dislikes",
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes"],
                        },
                        then: true,
                        else: false,
                    },
                },
                isDisLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$dislikes"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
    ]);

    if (video.length <= 0) throw new ApiError(400, "No video found");

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video sent successfully"));
});

const updateVideo = asyncHandler(async (req: RequestUser, res: Response) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail
    //get video
    //search in db
    //updated video details
    //return updated video details

    try {
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }

        const { title, description } = req.body;

        if (!title || typeof title !== "string" || title.trim() === "") {
            throw new ApiError(400, "Invalid title");
        }

        if (
            !description || typeof description !== "string"
        ) {
            throw new ApiError(400, "Invalid description");
        }

        const thumbnailLocalPath = req.file?.path;
        if (!thumbnailLocalPath) {
            throw new ApiError(400, "Thumbnail file is required");
        }
        const thumbnailOnCloudinary = await uploadOnCloudnary(
            thumbnailLocalPath,
        );

        const video = await Video.findByIdAndUpdate(
            videoId,
            {
                owner: req.user?._id,
            },
            {
                title: title,
                description: description,
                thumbnail: thumbnailOnCloudinary?.url,
            },
            { new: true },
        );

        if (!video) {
            throw new ApiError(
                404,
                "Video not found or you are not allowed to update this video",
            );
        }

        return res
            .status(200)
            .json(new ApiResponse(200, video, "Video updated successfully"));
    } catch (error: any) {
        console.error("Error in updating video:", error);
        throw new ApiError(500, error.message || "Interal server error");
    }
});

const deleteVideo = asyncHandler(async (req: RequestUser, res: Response) => {
    const { videoId } = req.params;
    //TODO: delete video
    //get video
    //search in db
    //ownership check
    //delete video

    try {
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }

        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        // if (!video?.Owner?.includes(req.user?._id)) {
        //   throw new ApiError(403,  "You are not allowd to delete this video");
        // }

        // const videoFile = await deleteVideoOnCloudinary(
        //     video.videoFile,
        //     "video",
        // );
        // const thumbnail = await deleteImageOnCloudinary(video.thumbnail, "img");

        // if (!videoFile && !thumbnail) {
        //     throw new ApiError(
        //         400,
        //         "thumbnail or videoFile is not deleted from cloudinary",
        //     );
        // }

        await Video.findByIdAndDelete(videoId);

        return res
            .status(200)
            .json(new ApiResponse(200, "Video deleted successfully"));
    } catch (error: any) {
        console.error("Error in deleting video:", error);
        throw new ApiError(500, error.message || "Internal server error");
    }
});

const togglePublishStatus = asyncHandler(
    async (req: RequestUser, res: Response) => {
        const { videoId } = req.params;

        //TODO: toggle publish status
        //search video in db
        //if exists then toggle status uploaded to cloudinary
        //else throw error
        //return the video details

        const video = await Video.findOne({
            _id: videoId,
            owner: req.user?._id,
        });

        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        video.isPublished = !video.isPublished;
        await video.save();

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    video,
                    "Video published status updated successfully",
                ),
            );
    },
);

const updateView = asyncHandler(async (req: RequestUser, res: Response) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "videoId required");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(400, "Video not found");

    //!   video.views += 1;
    const updatedVideo = await video.save();
    if (!updatedVideo) {
        throw new ApiError(400, "Error occurred on updating view");
    }

    let watchHistory;
    if (req.user) {
        watchHistory = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $push: {
                    watchHistory: new mongoose.Types.ObjectId(videoId),
                },
            },
            {
                new: true,
            },
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isSuccess: true, views: updatedVideo.views, watchHistory },
                "Video views updated successfully",
            ),
        );
});

export {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
};
