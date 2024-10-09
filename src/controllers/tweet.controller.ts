import { Tweet } from "../models/tweet.model.ts";
import mongoose, { isValidObjectId } from "mongoose";
import {User} from "../models/user.model.ts";
import { ApiError } from "../utils/ApiError.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { Request, Response } from "express";
const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
});

export { createTweet, deleteTweet, getUserTweets, updateTweet };
